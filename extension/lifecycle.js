export const PHASE = Object.freeze({
  UNKNOWN:"unknown",
  COLLAPSED:"collapsed",
  OPENING:"opening",
  EXPANDED:"expanded",
  CLOSING:"closing"
});

export function createWindowLifecycle() {
  return { phase:PHASE.UNKNOWN, pendingCommand:null };
}

export function railVisible(state) {
  return state.phase === PHASE.COLLAPSED;
}

export function reduceLifecycle(state,event) {
  const next={...state};
  switch(event.type) {
    case "ASSUME_COLLAPSED":
      if(next.phase===PHASE.UNKNOWN) next.phase=PHASE.COLLAPSED;
      break;
    case "OPEN_REQUEST":
      next.phase=PHASE.OPENING;
      if(event.command) next.pendingCommand=event.command;
      break;
    case "PANEL_OPENED":
    case "PANEL_CONNECTED":
      next.phase=PHASE.EXPANDED;
      break;
    case "CLOSE_REQUEST":
      next.phase=PHASE.CLOSING;
      break;
    case "PANEL_CLOSED":
      next.phase=PHASE.COLLAPSED;
      break;
    case "OPEN_FAILED":
      next.phase=PHASE.COLLAPSED;
      break;
    case "CLOSE_FAILED":
      next.phase=PHASE.EXPANDED;
      break;
    case "QUEUE_COMMAND":
      next.pendingCommand=event.command || null;
      break;
    case "CONSUME_COMMAND":
      next.pendingCommand=null;
      break;
    default:
      throw new Error(`Unknown lifecycle event: ${event.type}`);
  }
  return next;
}
