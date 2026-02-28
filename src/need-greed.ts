// @ts-nocheck
import { SerializedLsmItem, createItemFromSerialized } from "./items";
import { SocketManager } from "./sockets";
import { logToChat } from "./util";

const FLAG_SCOPE = "loot-slot-machine";
const FLAG_KEY = "needGreed";

export interface NeedGreedState {
  phase: "voting" | "rolling" | "complete";
  serializedItem: SerializedLsmItem;
  templateData: any;
  itemName: string;
  itemImg: string;
  itemDescription: string;
  votes: Record<string, "need" | "greed">;
  eligibleUserIds: string[];
  rolls: Record<string, number>;
  rollingUserIds: string[];
  winnerId: string | null;
  createdItemUuid: string | null;
}

// ─── Post the initial Need/Greed chat message ───

export async function postNeedGreedMessage(
  serializedItem: SerializedLsmItem,
  templateData: any,
  itemName: string,
  itemImg: string,
  itemDescription: string
) {
  const eligibleUsers = game.users.filter(
    (u: any) => !u.isGM && u.active && u.character
  );

  if (eligibleUsers.length === 0) {
    logToChat("No active players with characters found. Item not distributed.");
    return;
  }

  const state: NeedGreedState = {
    phase: "voting",
    serializedItem,
    templateData,
    itemName,
    itemImg,
    itemDescription,
    votes: {},
    eligibleUserIds: eligibleUsers.map((u: any) => u.id),
    rolls: {},
    rollingUserIds: [],
    winnerId: null,
    createdItemUuid: null,
  };

  const content = renderNeedGreedContent(state);

  await ChatMessage.create({
    content,
    speaker: { alias: "Loot Slot Machine" },
    flags: { [FLAG_SCOPE]: { [FLAG_KEY]: state } },
  });
}

// ─── Render HTML based on current state ───

function renderNeedGreedContent(state: NeedGreedState): string {
  const itemCard = `
    <div class="lsm-need-greed">
      <div class="lsm-ng-item-card">
        <img src="${state.itemImg}" alt="${state.itemName}" />
        <div class="lsm-ng-item-info">
          <h3>${state.itemName}</h3>
        </div>
      </div>
  `;

  if (state.phase === "voting") {
    const rows = state.eligibleUserIds
      .map((uid) => {
        const user = game.users.get(uid);
        const name = user?.character?.name ?? user?.name ?? "Unknown";
        const vote = state.votes[uid];

        if (vote) {
          const voteLabel = vote === "need" ? "Need" : "Greed";
          const voteClass = vote === "need" ? "need" : "greed";
          return `
            <div class="lsm-ng-vote-row">
              <span class="lsm-ng-player-name">${name}</span>
              <span class="lsm-ng-vote-result ${voteClass}">${voteLabel}</span>
            </div>`;
        }

        return `
          <div class="lsm-ng-vote-row">
            <span class="lsm-ng-player-name">${name}</span>
            <button class="lsm-ng-btn lsm-ng-need" data-action="need" data-user-id="${uid}">Need</button>
            <button class="lsm-ng-btn lsm-ng-greed" data-action="greed" data-user-id="${uid}">Greed</button>
          </div>`;
      })
      .join("");

    return itemCard + `<div class="lsm-ng-votes">${rows}</div></div>`;
  }

  if (state.phase === "rolling") {
    const votesSummary = state.eligibleUserIds
      .map((uid) => {
        const user = game.users.get(uid);
        const name = user?.character?.name ?? user?.name ?? "Unknown";
        const vote = state.votes[uid];
        const voteLabel = vote === "need" ? "Need" : "Greed";
        const voteClass = vote === "need" ? "need" : "greed";
        return `<span class="lsm-ng-vote-result ${voteClass}">${name}: ${voteLabel}</span>`;
      })
      .join(" | ");

    const allGreed = state.rollingUserIds.length === state.eligibleUserIds.length;
    const rollTitle = allGreed
      ? "All Greed — Roll for vendor rights!"
      : "Contested Need — Roll off!";

    const rows = state.rollingUserIds
      .map((uid) => {
        const user = game.users.get(uid);
        const name = user?.character?.name ?? user?.name ?? "Unknown";
        const roll = state.rolls[uid];

        if (roll !== undefined) {
          return `
            <div class="lsm-ng-vote-row">
              <span class="lsm-ng-player-name">${name}</span>
              <span class="lsm-ng-roll-result">${roll}</span>
            </div>`;
        }

        return `
          <div class="lsm-ng-vote-row">
            <span class="lsm-ng-player-name">${name}</span>
            <button class="lsm-ng-btn lsm-ng-roll" data-action="roll-d100" data-user-id="${uid}">Roll d100</button>
          </div>`;
      })
      .join("");

    return (
      itemCard +
      `<div class="lsm-ng-vote-summary">${votesSummary}</div>
       <div class="lsm-ng-roll-section">
         <h4>${rollTitle}</h4>
         ${rows}
       </div>
      </div>`
    );
  }

  // phase === "complete"
  if (state.winnerId) {
    const winner = game.users.get(state.winnerId);
    const winnerName = winner?.character?.name ?? winner?.name ?? "Unknown";
    const uuidLink = state.createdItemUuid
      ? `@UUID[${state.createdItemUuid}]`
      : state.itemName;

    return (
      itemCard +
      `<div class="lsm-ng-winner">${winnerName} wins ${state.itemName}!</div>
      </div>`
    );
  }

  return itemCard + `<div class="lsm-ng-winner">No winner determined.</div></div>`;
}

// ─── Socket handlers (run on GM client only) ───

export async function handleVoteOnGM(
  messageId: string,
  userId: string,
  action: "need" | "greed"
) {
  if (!game.user.isGM) return;

  const message = game.messages.get(messageId);
  if (!message) return;

  const state: NeedGreedState = message.getFlag(FLAG_SCOPE, FLAG_KEY);
  if (!state || state.phase !== "voting") return;

  // Prevent double-voting
  if (state.votes[userId]) return;

  // Record vote
  state.votes[userId] = action;

  // Check if all eligible users have voted
  const allVoted = state.eligibleUserIds.every((uid) => state.votes[uid]);

  if (allVoted) {
    const needVoters = state.eligibleUserIds.filter(
      (uid) => state.votes[uid] === "need"
    );

    if (needVoters.length === 1) {
      // Single need voter wins outright
      state.winnerId = needVoters[0];
      state.phase = "complete";
      await resolveDistribution(message, state);
      return;
    } else if (needVoters.length >= 2) {
      // Multiple need voters: rolloff among them
      state.phase = "rolling";
      state.rollingUserIds = needVoters;
      state.rolls = {};
    } else {
      // All greed: rolloff among everyone
      state.phase = "rolling";
      state.rollingUserIds = [...state.eligibleUserIds];
      state.rolls = {};
    }
  }

  // Update the message
  const content = renderNeedGreedContent(state);
  await message.update({
    content,
    [`flags.${FLAG_SCOPE}.${FLAG_KEY}`]: state,
  });
}

export async function handleRollOnGM(
  messageId: string,
  userId: string,
  rollTotal: number
) {
  if (!game.user.isGM) return;

  const message = game.messages.get(messageId);
  if (!message) return;

  const state: NeedGreedState = message.getFlag(FLAG_SCOPE, FLAG_KEY);
  if (!state || state.phase !== "rolling") return;

  // Prevent double-rolling
  if (state.rolls[userId] !== undefined) return;

  // Must be a rolling participant
  if (!state.rollingUserIds.includes(userId)) return;

  // Record roll
  state.rolls[userId] = rollTotal;

  // Check if all rolling users have rolled
  const allRolled = state.rollingUserIds.every(
    (uid) => state.rolls[uid] !== undefined
  );

  if (allRolled) {
    // First: update message to show ALL rolls (including the last one)
    const rollContent = renderNeedGreedContent(state);
    await message.update({
      content: rollContent,
      [`flags.${FLAG_SCOPE}.${FLAG_KEY}`]: state,
    });

    // Find highest roll
    const maxRoll = Math.max(...state.rollingUserIds.map((uid) => state.rolls[uid]));
    const winners = state.rollingUserIds.filter(
      (uid) => state.rolls[uid] === maxRoll
    );

    if (winners.length === 1) {
      // Clear winner
      state.winnerId = winners[0];
      state.phase = "complete";
      await resolveDistribution(message, state);
      return;
    } else {
      // Tie! Re-roll among tied players only
      state.rollingUserIds = winners;
      state.rolls = {};
    }
  }

  // Update the message
  const content = renderNeedGreedContent(state);
  await message.update({
    content,
    [`flags.${FLAG_SCOPE}.${FLAG_KEY}`]: state,
  });
}

// ─── GM skip button handler ───

export async function handleSkipOnGM(messageId: string, userId: string) {
  if (!game.user.isGM) return;

  const message = game.messages.get(messageId);
  if (!message) return;

  const state: NeedGreedState = message.getFlag(FLAG_SCOPE, FLAG_KEY);
  if (!state) return;

  if (state.phase === "voting" && !state.votes[userId]) {
    state.votes[userId] = "greed";
  } else if (state.phase === "rolling" && state.rolls[userId] === undefined) {
    // Give skipped player a 0 roll
    state.rolls[userId] = 0;
  }

  // Re-process via the appropriate handler to check completion
  if (state.phase === "voting") {
    // Update flags first, then re-trigger vote check
    await message.update({
      [`flags.${FLAG_SCOPE}.${FLAG_KEY}`]: state,
    });
    await handleVoteOnGM(messageId, userId, "greed");
    return;
  }

  const content = renderNeedGreedContent(state);
  await message.update({
    content,
    [`flags.${FLAG_SCOPE}.${FLAG_KEY}`]: state,
  });

  // Check if this completes rolling
  const allRolled = state.rollingUserIds.every(
    (uid) => state.rolls[uid] !== undefined
  );
  if (allRolled) {
    await handleRollOnGM(messageId, userId, 0);
  }
}

// ─── Item distribution resolution ───

async function resolveDistribution(
  message: ChatMessage,
  state: NeedGreedState
) {
  if (!state.winnerId) return;

  const winner = game.users.get(state.winnerId);
  const actor = winner?.character;
  const winnerName = actor?.name ?? winner?.name ?? "Unknown";

  if (!actor) {
    logToChat(`Winner has no assigned character. Item not distributed.`);
    // Mark original message as complete in flags only (keep roll display)
    state.phase = "complete";
    await message.update({
      [`flags.${FLAG_SCOPE}.${FLAG_KEY}`]: state,
    });
    return;
  }

  try {
    const item = await createItemFromSerialized(
      state.serializedItem,
      state.templateData,
      actor
    );

    state.createdItemUuid = item.uuid;
    state.phase = "complete";

    // Mark original message as complete in flags only (keep roll display intact)
    await message.update({
      [`flags.${FLAG_SCOPE}.${FLAG_KEY}`]: state,
    });

    // Post winner as a separate chat message
    const winnerContent = `
      <div class="lsm-need-greed">
        <div class="lsm-ng-item-card">
          <img src="${state.itemImg}" alt="${state.itemName}" />
          <div class="lsm-ng-item-info">
            <h3>${state.itemName}</h3>
          </div>
        </div>
        <div class="lsm-ng-winner">${winnerName} wins ${state.itemName}!</div>
      </div>`;

    await ChatMessage.create({
      content: winnerContent,
      speaker: { alias: "Loot Slot Machine" },
    });

    const uuid = await TextEditor.enrichHTML(
      `${actor.name} received @UUID[${item.uuid}]`,
      {}
    );
    logToChat(uuid);
  } catch (err: any) {
    console.error("LSM: Failed to create item for winner", err);
    logToChat(`Failed to create item: ${err.message}`);
  }
}

// ─── Chat message click handler (called from renderChatMessage hook) ───

export function attachNeedGreedListeners(message: ChatMessage, html: any) {
  const state: NeedGreedState = message.getFlag(FLAG_SCOPE, FLAG_KEY);
  if (!state) return;
  if (state.phase === "complete") return;

  // Need/Greed vote buttons
  html.querySelectorAll("[data-action='need'], [data-action='greed']").forEach(
    (btn: HTMLElement) => {
      btn.addEventListener("click", async (event: Event) => {
        const target = event.currentTarget as HTMLElement;
        const action = target.dataset.action as "need" | "greed";
        const targetUserId = target.dataset.userId;

        // Only allow clicking your own buttons
        if (targetUserId !== game.user.id) {
          ui.notifications?.warn("You can only vote for yourself!");
          return;
        }

        // Disable button immediately for responsiveness
        target.disabled = true;

        SocketManager.socket?.executeAsGM(
          "needGreedVote",
          message.id,
          game.user.id,
          action
        );
      });
    }
  );

  // Roll d100 buttons
  html.querySelectorAll("[data-action='roll-d100']").forEach(
    (btn: HTMLElement) => {
      btn.addEventListener("click", async (event: Event) => {
        const target = event.currentTarget as HTMLElement;
        const targetUserId = target.dataset.userId;

        if (targetUserId !== game.user.id) {
          ui.notifications?.warn("You can only roll for yourself!");
          return;
        }

        target.disabled = true;

        const roll = new Roll("1d100");
        await roll.evaluate();

        await roll.toMessage({
          speaker: {
            alias: game.user.character?.name ?? game.user.name,
          },
          flavor: `Need/Greed Roll for ${state.itemName}`,
        });

        SocketManager.socket?.executeAsGM(
          "needGreedRoll",
          message.id,
          game.user.id,
          roll.total
        );
      });
    }
  );

  // GM skip buttons
  if (game.user.isGM) {
    html.querySelectorAll("[data-action='gm-skip']").forEach(
      (btn: HTMLElement) => {
        btn.addEventListener("click", async (event: Event) => {
          const target = event.currentTarget as HTMLElement;
          const targetUserId = target.dataset.userId;
          await handleSkipOnGM(message.id, targetUserId);
        });
      }
    );
  }
}
