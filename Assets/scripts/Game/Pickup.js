#pragma strict
#pragma downcast

var owner : UnitSimple;
var hasBeenSnapped : boolean;


function Start ()
{
}

function Pickup(pickedUpBy : UnitSimple) : boolean
{
   if (owner)
      return false;
   owner = pickedUpBy;
   if (collider.attachedRigidbody)
      collider.attachedRigidbody.isKinematic = true;
   owner.pickup = transform;
   transform.parent = owner.pickupAttach;
   transform.localPosition = Vector3.zero;
   transform.rotation = Quaternion.identity;
   //collider.enabled = false;
   return true;
}

function DropDelayed()
{
   //collider.attachedRigidbody.mass = originalMass;
   transform.position.y += 0.001f; // wake up physics
   collider.attachedRigidbody.isKinematic = false;
}

function Drop()
{
   //collider.enabled = true;
   if (collider.attachedRigidbody)
   {
      //transform.rotation = Quaternion.identity;
      //transform.position.y += 1.0f;
//collider.attachedRigidbody.mass = originalMass;
//collider.attachedRigidbody.isKinematic = false;
      //transform.position += (owner.transform.forward * -2.1f);
      //pickup.collider.attachedRigidbody.AddForce(0,200,0);
   }
   owner.pickup = null;
   owner = null;
   transform.parent = null;
   //Invoke("DropDelayed", 0.5f);
   DropDelayed();
}

function OnCollisionEnter(collisionInfo : Collision)
{
   //Debug.Log("COLLISION: me="+gameObject.name+" other="+collisionInfo.collider.gameObject.name);

   if (owner)
      return;

   var other : Transform = collisionInfo.collider.transform;
   if (other.gameObject.tag == "MANIP")
   {
      // Wanted to potentially make blocks automatically snap together
      // into more complex shapes if they collide from unit interaction.
      // - Thoughts on simplifying this crazy function:
      // 1. Make only single blocks pickupable by blue.
      // 2. Just handle snapping to first collider, ignore the rest
/*
      // Connected RigidBody - Attempt #3, using Fixed Joints
      var otherPickup : Pickup = other.gameObject.GetComponent.<Pickup>();
      if (otherPickup.owner)
         return;

      // Snap to box relative position, this might get complicated for
      // complex shapes, maybe
      if (otherPickup.hasBeenSnapped == false)
      {
         var rp : Vector3 = transform.InverseTransformPoint(other.transform.position).normalized;
         Debug.Log("attachdir="+rp);
         if (rp.y > rp.z && rp.y > rp.x)
         {

            other.collider.attachedRigidbody.isKinematic = true;
            other.transform.position = transform.position + (Vector3.up*3.5);
            other.collider.attachedRigidbody.isKinematic = false;
         }
        otherPickup.hasBeenSnapped = true;
      }

      // Look for fixed joint on other that is attached to me first!
      var makeNewJoint : boolean = true;
      var fjs : FixedJoint[];
      fjs = GetComponents.<FixedJoint>();
      for (var j : FixedJoint in fjs)
      {
         if (j.connectedBody == collider.attachedRigidbody)
         {
            makeNewJoint = false;
            Debug.Log("Already attached: me="+gameObject.name+" other="+other.gameObject.name);
            break;
         }

      }

      if (makeNewJoint)
      {
         var fj : FixedJoint = gameObject.AddComponent(FixedJoint);
         fj.connectedBody = other.collider.attachedRigidbody;
      }
*/

/*
      // Connected RigidBody - Attempt #2, making a new parent rigidbody
      var go = new GameObject("Test");
      go.transform.position = collisionInfo.contacts[0].point;
      go.gameObject.layer = gameObject.layer;
      go.gameObject.tag = gameObject.tag;

      go.AddComponent(Rigidbody);
      go.AddComponent("Pickup");

      Destroy(other.GetComponent(Rigidbody));
      Destroy(other.GetComponent("Pickup"));
      Destroy(GetComponent(Rigidbody));
      Destroy(GetComponent("Pickup"));

      other.parent = go.transform;
      transform.parent = go.transform;
*/


/*
      // Connected RigidBody - Attempt #1: Using parented transforms
      if (transform.parent)
      {
         Debug.Log("RETURN: me="+gameObject.name+" other="+other.gameObject.name);
         return;
      }

      transform.parent = (other.parent) ? other.root : other;

      if (transform.parent)
         Debug.Log("PARENT: me="+gameObject.name+" p="+transform.parent.gameObject.name);

      if (transform.parent && collider.attachedRigidbody)
      {
         Physics.IgnoreCollision(collider, transform.parent.collider);
         collider.attachedRigidbody.isKinematic = true;
      }
*/
   }


   if (transform.parent)
   {
      var unit : UnitSimple = transform.root.GetComponentInChildren(UnitSimple);
      if (unit)
      {

         var transformedHP : Vector3 = unit.transform.InverseTransformPoint(collisionInfo.contacts[0].point);

         if (transformedHP.z > 0.0)
         {

         unit.ReverseDirection();
         //Drop();
         //unit.DropPickup();
         Debug.Log("HIT WHILE CARRYING");
         }
      }
   }

}


function OnTriggerEnter(other : Collider)
{
   if (transform.parent
      && other.gameObject.tag != "UNIT"
      && other.gameObject.tag != "WASHABLE")
   {

      // Top most unit in chain
      var unit : UnitSimple = transform.root.GetComponentInChildren(UnitSimple);
      if (unit)
      {
         var transformedHP : Vector3 = unit.transform.InverseTransformPoint(other.transform.position);
         if (transformedHP.z > 0.0)
         {
            unit.ReverseDirection();
            //unit.isStopped = true;
            //unit.DropPickup();
            //Drop();
            Debug.Log("HIT WHILE CARRYING T: go="+gameObject.name+" ot="+other.gameObject.name);
         }
      }
   }

}
