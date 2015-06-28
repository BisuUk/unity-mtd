# [Revision 305](https://code.google.com/p/unity-mtd/source/detail?r=305) #
  * Suggest: Balance - Towers need to be much larger. You can pile too much firepower into a single area.
  * Bug: Client could not click through spawned queue units to modify queue, gotta fix the collider.
  * Bug: A tower was shooting across the map at one point, wonder if the collider f'd up its target list.
  * Note: Network util seems pretty good at this point, played a 1v1 over the internet with no real stutter.

# [Revision 295](https://code.google.com/p/unity-mtd/source/detail?r=295) #
  * Bug: Network lag became unplayable on client when units started pouring in. Too many RPCs? Prediction needed perhaps?
  * Suggest: More money to defender now that it has abilities.
  * Note: Playability is noticeably improving. Game is actually almost fun now. =]

# [Revision 270](https://code.google.com/p/unity-mtd/source/detail?r=270) #
  * Bug: Stuck in bandbox selection mode, could not escape, right-click, nothing. Effectively ending the game.
  * Suggest: Haste too OP, especially early.
  * Suggest: Units/Squads them tend to need 'babysitting' to actually penetrate through fronts. Is this what we want?

# [Revision 254](https://code.google.com/p/unity-mtd/source/detail?r=254) #
  * FIXED Bug: Clicking a tower when orienting a direct fire, creates clicked tower instead of original.
  * Suggest: More money towards the end for defender?
  * Suggest: Bring back medium units?
  * Suggest: Defender gets direct AOE ability?

# [Revision 241](https://code.google.com/p/unity-mtd/source/detail?r=241) #
  * DONE Towers need to be stronger.
  * DONE May need to get rid of L M H for units and just do small & large. Can't seem to come up with a viable way for medium units to make sense. You might as well wait to make large ones.
  * DONE Need slightly more money going to the attacker.
  * DONE May need a money cap for the attacker, so he has to spend money or lose potential income from future infusions.

# [Revision 219](https://code.google.com/p/unity-mtd/source/detail?r=219) #

## Features ##
  * KINDA Queueing of multiple unit pre-bought launches.
  * KINDA Make stun targetable, instead of area.
  * KINDA Make haste targetable on squads (not units), instead of area.
  * DONE Keep ability open after a single usage (more like mode)?
  * DONE Message feedback for can't afford tower.
  * NOPE Cooldown on haste/stun?
  * DONE Towers need visual queues to tell what type they are.

## Tuning ##
  * DONE Map - Less togetherness of path at the end.
  * DONE Stun - Slightly more expensive.

## Bugs ##
  * FIXED Emitter deducts money when units are in countdown queue.
  * State issues with lobby.
  * Shield FX sometimes full alpha when shot with painter tower.


# [Revision 206](https://code.google.com/p/unity-mtd/source/detail?r=206) #
## Tuning ##
  * DONE Attacker flooding early, need less credits & lower infusions early. (now 50/1000)
  * DONE Attacker starved at end, need larger end infusions (was 100/500). (now 50/1000)
  * Attacker build times a bit too lengthy late, lower slightly.
  * DONE Defender painter tower needs to be less effective or more expensive. (now 1/3 of previous effectiveness)

## Enhancements/Modifications ##
  * DONE Attacker abilities should use credits instead of mana.
  * Defend GUI, keep tower settings between placements.
  * Towers need visual queues to tell what type they are.
  * DONE Higher strength towers should be physically larger.
  * DONE Change sliders to buttons, 1-5.
  * DONE FOV relatively unused, remove slider & make static for tower types?
  * Game mode/Game state handling between rounds.

# [Revision 176](https://code.google.com/p/unity-mtd/source/detail?r=176) #
## Tuning ##
  * DONE Emitter - Faster launch times.
  * DONE Emitter - Minimum launch speed faster.
  * DONE Emitter - Controls squad color, instead of each unit?
  * Tower - Strength max cost higher. Remove strength altogether?
  * Tower - Color changing needs to be more expensive and take longer.
  * DONE Tower - Decrease painter effectiveness. Only effects point units?
  * DONE Map - Need to be larger scale.

## Bugs ##
  * FIXED Units are attack-able before the reach the start point.
  * FIXED Emitter preview unit sometimes isn't modifiable with the UI.
  * Game state not completely reset at game end.