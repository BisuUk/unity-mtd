#pragma strict

var action : ActionType;
var magnitude : float;
var vector : Vector3;
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
         case ActionType.ACTION_KILL:
            if (!Network.isClient)
               unit.Kill();
            break;

         case ActionType.ACTION_REVERSE:
            unit.ReversePath();
            break;

         case ActionType.ACTION_COLOR_CHANGE:
            unit.SetActualColor(color.r, color.g, color.b);
            break;

         case ActionType.ACTION_COLOR_MIX:
            var mixColor : Color = Utility.GetMixColor(color, unit.actualColor);
            unit.SetActualColor(mixColor.r, mixColor.g, mixColor.b);
            break;

         case ActionType.ACTION_PUZZLE_SCORE:
            Camera.main.GetComponent(CameraControl2).orbitTarget = transform;
            break;

         case ActionType.ACTION_BOUNCE:
            var v : Vector3 = transform.position+(unit.transform.forward*magnitude);
            unit.LeapTo(Utility.GetGroundAtPosition(v, 0));
            break;

      }
   }
}