#pragma strict

var triggeredTransforms : Transform[];
var requiredColor : Color;
var requiredUnitTypes : int[];

private var colliderCount : int;

function Awake()
{
   SetRequiredColor(requiredColor);
}

function SetRequiredColor(color : Color)
{
   requiredColor = color;
   renderer.material.color = requiredColor;
}

function OnTriggerEnter(other : Collider)
{
   var unit : Unit = other.GetComponent(Unit);

   var noCollidersBefore : boolean = (colliderCount==0);

   if (unit && isRequiredUnitType(unit.unitType) && isRequiredColor(unit.color))
      colliderCount += 1;

   if (noCollidersBefore && colliderCount > 0)
   {
      for (var trigger : Transform in triggeredTransforms)
         trigger.SendMessage("Trigger", SendMessageOptions.DontRequireReceiver);
   }
}

function OnTriggerExit(other : Collider)
{
   var unit : Unit = other.GetComponent(Unit);
   if (unit && isRequiredUnitType(unit.unitType) && isRequiredColor(unit.color))
   {
      colliderCount -= 1;

      if (colliderCount==0)
      {
         for (var trigger : Transform in triggeredTransforms)
            trigger.SendMessage("Untrigger", SendMessageOptions.DontRequireReceiver);
      }
   }
}

private function isRequiredColor(unitColor : Color) : boolean
{
   return (unitColor == requiredColor);
}

private function isRequiredUnitType(unitType : int) : boolean
{
   for (var i : int in requiredUnitTypes)
   {
      if (unitType == i)
         return true;
   }
   return false;
}