#pragma strict

var unit : GameObject[];
var tower : GameObject[];
var ability : GameObject[];
var splatter : Transform;


function Unit(type : int) : GameObject
{
   if (type < 0 || type >= unit.Length)
   {
      Debug.LogError("ERROR: Cost not defined for unit type "+type+"!");
      return null;
   }
   return unit[type];
}

function Ability(type : int) : GameObject
{
   if (type < 0 || type >= ability.Length)
   {
      Debug.LogError("ERROR: Cost not defined for ability type "+type+"!");
      return null;
   }
   return ability[type];
}

function Tower(type : int) : GameObject
{
   if (type < 0 || type >= tower.Length)
   {
      Debug.LogError("ERROR: Cost not defined for tower type "+type+"!");
      return null;
   }
   return tower[type];
}
