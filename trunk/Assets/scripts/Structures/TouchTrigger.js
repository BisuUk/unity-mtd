#pragma strict
#pragma downcast

class TouchTriggerInfo
{
   var target : Transform;
   var intData : int;
   var floatData : float;
   var strData : String;
   var associate : Transform;
   @HideInInspector var trigger : TouchTrigger;
   @HideInInspector var on : boolean;
};
var useValidTransforms : boolean = true;
var validTransforms : Transform[];

var useValidTags : boolean = false;
var validTags : String[];

var targets : TouchTriggerInfo[];
var minCollidersRequired : int;
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

   var valid : boolean = false;

   if (useValidTransforms)
   {
      for (var t : Transform in validTransforms)
      {
         if (other.transform == t)
         {
            valid = true;
            break;
         }
      }
   }
   if (valid == false && useValidTags)
   {
      for (var tag : String in validTags)
      {
         if (other.gameObject.tag == tag)
         {
            valid = true;
            break;
         }
      }
   }


   if (valid && colliders.Contains(transform) == false)
   {
      colliders.Add(other.transform);
      if (colliders.Count == minCollidersRequired)
      {
         hasOneShotted = true;
         for (var targetTouchInfo : TouchTriggerInfo in targets)
         {
            targetTouchInfo.on = true;
            targetTouchInfo.trigger = this;
            targetTouchInfo.target.SendMessage("TouchTrigger", targetTouchInfo, SendMessageOptions.DontRequireReceiver);
         }
      }

      if (isOneShot)
         colliders.Clear();
   }
}

function OnTriggerExit(other : Collider)
{
   if (colliders.Contains(other.transform))
   {
      colliders.Remove(other.transform);
      if (colliders.Count < minCollidersRequired)
      {
         for (var targetTouchInfo : TouchTriggerInfo in targets)
         {
            targetTouchInfo.on = false;
            targetTouchInfo.trigger = this;
            targetTouchInfo.target.SendMessage("TouchTrigger", targetTouchInfo, SendMessageOptions.DontRequireReceiver);
         }
      }
   }
}
