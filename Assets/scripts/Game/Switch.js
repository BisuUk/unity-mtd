#pragma strict

var triggeredTransforms : Transform[];
var requiredColor : Color;

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
   if (unit)
   {
      // CHECK unit type == 0;
      for (var trigger : Transform in triggeredTransforms)
      {
         trigger.SendMessage("Trigger", SendMessageOptions.DontRequireReceiver);
      }

   }
}

function OnTriggerExit(other : Collider)
{
   var unit : Unit = other.GetComponent(Unit);
   if (unit)
   {
      // CHECK unit type == 0;
      for (var trigger : Transform in triggeredTransforms)
      {
         trigger.SendMessage("Untrigger", SendMessageOptions.DontRequireReceiver);
      }

   }
}