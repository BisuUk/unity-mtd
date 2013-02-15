#pragma strict
#pragma downcast

var teleportLocation : Transform;
var specificThingToTeleport : Transform;

function OnTriggerEnter(other : Collider)
{
   if (teleportLocation)
   {
      if (specificThingToTeleport)
      {
         if (other.transform == specificThingToTeleport)
            other.transform.position = teleportLocation.position;
      }
      else
      {
         var cc : CharacterController = other.GetComponent(CharacterController);
         if (cc)
            cc.transform.position = teleportLocation.position;
      }
   }
   else
   {
      Debug.Log("Need to assign a teleport location");
   }
}