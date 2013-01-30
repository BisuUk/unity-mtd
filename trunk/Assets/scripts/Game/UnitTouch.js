#pragma strict

var action : ActionType;
var magnitude : float;
var vector : Vector3;
var color : Color;
var transformsToColor : Transform[];

function Start()
{
   //for (var t : Transform in transformsToColor)
   //{
      //t.renderer.material.SetColor("_horizonColor", color);
      //t.renderer.material.SetColor("_TintColor", color);
      //t.renderer.material.color = color;
   //}
}

function OnTriggerEnter(other : Collider)
{
   var unit : UnitSimple = other.GetComponent(UnitSimple);
   if (unit)
   {
      switch (action)
      {
         case ActionType.ACTION_KILL:
            if (!Network.isClient)
               unit.Splat();
            break;

         case ActionType.ACTION_REVERSE:
            unit.ReverseDirection();
            break;

         case ActionType.ACTION_COLOR_CHANGE:
            unit.SetColor(color.r, color.g, color.b);
            break;

         case ActionType.ACTION_COLOR_MIX:
            var mixColor : Color = Utility.GetMixColor(color, unit.color);
            unit.SetColor(mixColor.r, mixColor.g, mixColor.b);
            break;

         case ActionType.ACTION_PUZZLE_SCORE:
            Camera.main.GetComponent(CameraControl).orbitTarget = transform;
            break;

         case ActionType.ACTION_BOUNCE:
            unit.InstantForce(vector.normalized * magnitude);
            break;

      }
   }
}