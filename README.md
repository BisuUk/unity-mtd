# Main Menu #
## _Single Player_ ##
This is mainly just a debugging/test mode now. There's no AI or scenarios defined yet, so hitting single player just drops you into a blank game, where you're effectively playing against yourself.

If you hit escape to drop to the main menu and reselect single player, it will switch between Attacker and Defender modes, so you can kinda see how each work.

## _Multiplayer_ ##
This is where primary playability focus has been.

This will bring you to a submenu where you can choose to host a game or connect to an existing game being hosted. If properly connect the player will be brought to a standard multiplayer lobby where you can select which side you are on and start the game.


---


# Playing the Game #

## _Core mechanics_ ##
### Tower Defense ###
The game is a standard desktop tower defense (DTD) game, where units are launched from a location and follow a predetermined path towards a goal objective, while attempting to survive turret defenses and obstacles.

### Color ###
All interactions between entities in the game are associated with a color. The magnitude of the effect for that interaction is directly proportional to the similarity in color between the source and the target. Eg. a blue damage tower will damage a fully blue unit for 100% of its base damage, a white unit for 50%, and a fully yellow unit for 0% damage. Similarly for haste effect, a fully red haste effect will only speed up a white unit by 50% of its maximum speed buff.

### Unit/Tower Attributes ###
Each tower and unit has a dynamically customizable attributes. Units have strength and color. Towers have strength, range, fire rate, and color. Each are explained below.

### Player Abilities ###
Players will have an assortment of abilities that can be used to dynamically affect the playing field. Such as painting units a specific color, stunning towers, and directly damaging units in an area. Each ability has a color associated with it which will scale of the ability's effect based on the likeness in color to the target.

## _Game Modes_ ##
### Assault (Fixed Time/High Score) ###
Given a fixed amount of time, one player/team will be designated the attacker and another player/team will be designated the defender. The attacker attempts to get as many Point units to the goal before time expires. 1 point will be rewarded for each Point unit that reaches the goal.

## _Camera Control_ ##
  * Hold middle mouse button (MMB) + drag - Slides the camera view around.
  * Mouse wheel - Zooms camera.
  * Hold F + drag - 3D Free look, probably won't be used much.
  * R - Returns camera to default down looking position.


---


## _Playing as an Attacker_ ##
An Attacker is provided with at least one unit launcher from which he/she may launch units with the intent to reach the endpoint goal. Any units created by a specific launcher, when launched, will follow a fixed path associated with that launcher.

An Attacker starts with a resource cap, and receives infusions of  resources at some configurable rate over time. If the cap is reached, any extra infusion resources will be wasted. The attacker can extend the resource cap by having Point units touch and capture the checkpoints that are visible along the path to the goal. The resource cap will be expanded to the value visible on the checkpoint.

Attackers may select a launcher by clicking on them with the left mouse button (LMB). When selected, a panel will appear that will allow for manipulation of that launcher's unit queue. The attacker may add, insert, remove or modify units in the queue.

Each unit can be assigned a strength, which will effect its size, health, speed, cost, launch time, and associated ability and are proportioned as follows:

**+Strength = +Size, +Health, +Effect magnitude/radius, +Cost, +LaunchTime -Speed**

The attacker can then assigned a color to the queue, changing the color will increase the cost of the queue in time and resources proportional to the color difference from the default color (white).

Once the unit queue is configured, the Attacker will want to launch the queue, and have the units begin down their path towards to the goal. Before launching a queue, the user will be notified of the cost in both resources and time in order to launch the currently configured queue. If the attacker does not have enough resources to launch, the launch command will not work. Otherwise, the resources will be deducted from the attacker, the units will appear on the game world on the launcher, visible to all players, and a launch countdown will begin. Units will then begin moving along the path, and will be NOT be attackable until after they have cleared the launch platform.

When a queue is launched, the maximum speed of ALL of the units in that queue will matched to the slowest unit in the queue. Eg. If 2 low strength units are paired with a high strength unit, the low strength units will be slowed to match the speed of the high strength unit.

Launchers may also be configured to "auto-launch" and will launch the configured unit queue as soon as the amount of resources becomes available.

### Unit Types ###
  * Point - Basic unit that has no special abilities, but is the only unit that can score points and capture checkpoints.
  * Healer - Heals any damaged units in its radius on an interval.
  * Tank - Shields units in its radius from damage, a unit under a tank's shield is invincible as the tank must die first.
  * Stun - At the site of its death, the stunner unit stuns towers within its radius. Essentially a kamikaze unit.

### Attacker Abilities ###
  * Haste - Will cause all units in the selected area to speed up for a brief period.
  * Paint - Will cause all units in the selected area to change color for a brief period.
  * Stun - Will stun a tower, and render it inoperative for a brief period.

### Attacker Hotkeys ###
  * 1 - Add Point unit to queue.
  * 2 - Add Healer unit to queue.
  * 3 - Add Tank unit to queue.
  * 4 - Add Stunner unit to queue.
  * Q - Make currently selected queue unit Low strength.
  * W - Make currently selected queue unit Medium strength.
  * E - Make currently selected queue unit High strength.
  * X,delete - Remove selected unit from queue.
  * Backspace - Clear the unit queue entirely.
  * Tab - Advance to next selected queue unit.
  * Shift+Tab - Advance to next selected queue unit.
  * UpArrow - Move current selected queue unit forward in queue.
  * DownArrow - Move current selected queue unit backward in queue.
  * Space - Launch unit queue.
  * Z - Toggle auto launch of queue.
  * F1 - Select Haste Unit ability.
  * F2 - Select Paint Unit ability.
  * F3 - Select Stun Tower ability.


---


## _Playing as a Defender_ ##

Some stuff about placing towers. Modifying towers. Multiselect.

### Tower Types ###
  * Direct - Fires at one unit at a time, has longer range, effect, and fire rate potential that AoE towers.
  * AoE - Fires at all units within its field-of-view, will hit multiple units but has less range, slower fire rate, and less effect potential than Direct towers.

### Tower Effects ###
  * Damage - Deals damage to units in order to destroy them.
  * Slow - Temporarily slows units down.
  * Paint - Temporarily colors units to match the firing tower's color.

### Tower Attributes ###

### Tower Targeting Behaviors ###

### Defender Abilities ###
  * Paint - Will cause all units in the selected area to change color for a brief period.
  * Blast - Will inflict damage on all units within the select area.

### Defender Hotkeys ###
  * 1 - Select Direct fire tower.
  * 2 - Select AoE tower.
  * Q - Set selected tower to Damage effect.
  * W - Set selected tower to Slow effect.
  * E - Set selected tower to Paint effect.
  * A - Cycle through tower strength settings.
  * S - Cycle through tower range settings.
  * D - Cycle through tower fire rate settings.
  * X,delete - Sell and remove selected tower.
  * alt+LMB - Copy selected tower.
  * Space - Apply modifications to existing tower.
  * F1 - Select Paint Unit ability.
  * F2 - Select Blast Unit ability.