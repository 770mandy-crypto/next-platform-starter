// The quests for both paths: the Egyptian (serve the Pharaoh) and the Hebrew
// (from Goshen). Pure rules: a run is plain data, and every event returns a
// new run plus the messages to show the player.
//
// Events:
//   { type: 'talk', id }                       talked to an NPC
//   { type: 'pickup', id, item, label }        picked something up
//   { type: 'visit', id, name }                reached a landmark

import { LANDMARK_IDS } from './world.js';

export const MAX_CARRY = 9;
const STEP_POINTS = 10;
const QUEST_POINTS = 100;

export const QUESTS = {
    egypt: {
        title: 'המסע של הפרעה',
        intro: 'אתה משרת של הפרעה. הוזיר בחצר הארמון צריך תבואה, ואחר כך יש לך עולם שלם לגלות.',
        steps: [
            { type: 'talk', npc: 'vizier', text: 'דבר עם הוזיר בחצר הארמון' },
            { type: 'collect', item: 'grain', label: 'תבואה', count: 3, text: 'אסוף 3 שקים של תבואה משדה א׳' },
            { type: 'deliver', npc: 'vizier', item: 'grain', label: 'תבואה', count: 3, text: 'החזר את התבואה לוזיר' },
            { type: 'visit', landmark: 'pyramids', text: 'הגע לפירמידות בגיזה' },
            { type: 'visit', landmark: 'sphinx', text: 'מצא את הספינקס שליד הפירמידות' },
            { type: 'explore', landmarks: LANDMARK_IDS, text: 'גלה את כל אתרי מצרים' },
        ],
    },
    hebrew: {
        title: 'המסע מגושן',
        intro: 'אתה נולד בגושן, בארץ הטובה שבצד היאור. הזקן צריך עזרה, ואמא מחכה למים.',
        steps: [
            { type: 'talk', npc: 'elder', text: 'דבר עם הזקן בכפר גושן' },
            { type: 'collect', item: 'water', label: 'מים', count: 3, text: 'מלא 3 כדים במים מהבאר' },
            { type: 'deliver', npc: 'mother', item: 'water', label: 'מים', count: 3, text: 'הבא את המים לאם בבית' },
            { type: 'collect', item: 'straw', label: 'קש', count: 2, text: 'אסוף 2 צרורות קש משדה ב׳' },
            { type: 'deliver', npc: 'elder', item: 'straw', label: 'קש', count: 2, text: 'החזר את הקש לזקן' },
            { type: 'visit', landmark: 'river-bridge', text: 'חצה את הגשר על הנילוס' },
            { type: 'visit', landmark: 'pyramids', text: 'ראה את הפירמידות שהמצרים בונים' },
            { type: 'explore', landmarks: LANDMARK_IDS, text: 'גלה את כל אתרי מצרים' },
        ],
    },
};

export const FACTIONS = Object.keys(QUESTS);

export function newRun(faction) {
    if (!QUESTS[faction]) throw new Error(`unknown faction: ${faction}`);
    return settle({ faction, step: 0, inventory: {}, visited: [], score: 0, done: false }, []).run;
}

export function currentStep(run) {
    return run.done ? null : QUESTS[run.faction].steps[run.step];
}

// Steps that finish by themselves (collecting, reaching a place, exploring)
// are checked here. Talking and delivering finish only on a talk event.
function isComplete(run, step) {
    if (!step) return false;
    switch (step.type) {
        case 'collect':
            return (run.inventory[step.item] || 0) >= step.count;
        case 'visit':
            return run.visited.includes(step.landmark);
        case 'explore':
            return step.landmarks.every((id) => run.visited.includes(id));
        default:
            return false;
    }
}

function complete(run, messages) {
    const quest = QUESTS[run.faction];
    const step = quest.steps[run.step];
    const next = { ...run, step: run.step + 1, score: run.score + STEP_POINTS };
    messages.push(`✓ ${step.text}`);
    if (next.step >= quest.steps.length) {
        next.done = true;
        next.score += QUEST_POINTS;
        messages.push(`סיימת את ${quest.title}! +${QUEST_POINTS} נקודות`);
    }
    return next;
}

// Completes as many steps as are already satisfied.
function settle(run, messages) {
    let current = run;
    while (!current.done && isComplete(current, currentStep(current))) {
        current = complete(current, messages);
    }
    return { run: current, messages };
}

export function applyEvent(run, event) {
    const messages = [];
    if (run.done) return { run, messages };

    let next = { ...run, inventory: { ...run.inventory }, visited: [...run.visited] };
    const step = currentStep(next);

    switch (event.type) {
        case 'visit':
            if (!next.visited.includes(event.id)) {
                next.visited.push(event.id);
                messages.push(`גילית: ${event.name}`);
            }
            break;

        case 'pickup': {
            const have = next.inventory[event.item] || 0;
            if (have >= MAX_CARRY) {
                messages.push(`התיק מלא ב${event.label}`);
            } else {
                next.inventory[event.item] = have + 1;
                messages.push(`+1 ${event.label}`);
            }
            break;
        }

        case 'talk':
            if (step && step.type === 'talk' && step.npc === event.id) {
                next = complete(next, messages);
            } else if (step && step.type === 'deliver' && step.npc === event.id) {
                const have = next.inventory[step.item] || 0;
                if (have >= step.count) {
                    next.inventory[step.item] = have - step.count;
                    if (next.inventory[step.item] === 0) delete next.inventory[step.item];
                    messages.push(`מסרת ${step.count} ${step.label}`);
                    next = complete(next, messages);
                } else {
                    messages.push(`חסר לך ${step.label}: ${have} מתוך ${step.count}`);
                }
            }
            break;
    }

    return settle(next, messages);
}

// How far along the current step is, for the HUD. Null when there is no count.
export function progressOf(run, step) {
    if (!step) return null;
    switch (step.type) {
        case 'collect':
        case 'deliver':
            return { have: Math.min(run.inventory[step.item] || 0, step.count), need: step.count };
        case 'visit':
            return { have: run.visited.includes(step.landmark) ? 1 : 0, need: 1 };
        case 'explore':
            return { have: step.landmarks.filter((id) => run.visited.includes(id)).length, need: step.landmarks.length };
        default:
            return null;
    }
}
