#pragma strict

enum TouchActionsType
{
   TOUCH_KILL,
   TOUCH_COLOR_CHANGE,
   TOUCH_COLOR_MIX,
   TOUCH_REVERSE
}

var action : TouchActionsType;
var color : Color;
var transformsToColor : Transform[];

function Start()
{
   for (var t : Transform in transformsToColor)
   {
      t.renderer.material.SetColor("_horizonColor", color);
      t.renderer.material.SetColor("_TintColor", color);
      t.renderer.material.color = color;
   }
}

function OnTriggerEnter(other : Collider)
{
   var unit : Unit = other.GetComponent(Unit);
   if (unit)
   {
      switch (action)
      {
         case TouchActionsType.TOUCH_KILL:
            if (!Network.isClient)
               unit.Kill();
            break;

         case TouchActionsType.TOUCH_REVERSE:
            unit.ReversePath();
            break;

         case TouchActionsType.TOUCH_COLOR_CHANGE:
            unit.SetActualColor(color.r, color.g, color.b);
            break;

         case TouchActionsType.TOUCH_COLOR_MIX:
            var mixColor : Color = Utility.GetMixColor(color, unit.actualColor);
            unit.SetActualColor(mixColor.r, mixColor.g, mixColor.b);
            break;
      }
   }
}