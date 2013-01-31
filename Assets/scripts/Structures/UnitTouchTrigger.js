#pragma strict
#pragma downcast

class UnitTouchTriggerInfo
{
   var target : Transform;
   var intData : int;
   var floatData : float;
   var strData : String;
   var associate : Transform;
   @HideInInspector var trigger : UnitTouchTrigger;
   @HideInInspector var on : boolean;
};

var targets : UnitTouchTriggerInfo[];
var minUnitsRequired : int;
var isOneShot : boolean;

private var colliders : List.<Transform>;
private var hasOneShotted : boolean;


function Awake()
{
   colliders = new List.<Transform>();
}

function OnTriggerEnter(other : Collider)
{
   if (isOneShot && hasOneShotted)
      return;

   var unit : UnitSimple = other.GetComponent(UnitSimple);
   if (unit && colliders.Contains(unit.transform) == false)
   {
      colliders.Add(unit.transform);
      if (colliders.Count == minUnitsRequired)
      {
         hasOneShotted = true;
         for (var i : UnitTouchTriggerInfo in targets)
         {
            i.on = true;
            i.trigger = this;
            i.target.SendMessage("UnitTouchTrigger", i, SendMessageOptions.DontRequireReceiver);
         }
      }

      if (isOneShot)
         colliders.Clear();

   }
}

function OnTriggerExit(other : Collider)
{
   var unit : UnitSimple = other.GetComponent(UnitSimple);
   if (unit && colliders.Contains(unit.transform))
   {
      colliders.Remove(unit.transform);
      if (colliders.Count < minUnitsRequired)
      {
         for (var i : UnitTouchTriggerInfo in targets)
         {
            i.on = false;
            i.trigger = this;
            i.target.SendMessage("UnitTouchTrigger", i, SendMessageOptions.DontRequireReceiver);
         }
      }
   }
}
