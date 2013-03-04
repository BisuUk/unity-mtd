#pragma strict
#pragma downcast

var carrier : UnitSimple;
var canBePickedUp : boolean;
var hasBeenSnapped : boolean;

function Awake()
{
   canBePickedUp = true;
}

function Pickup(pickedUpBy : UnitSimple) : boolean
{
   if (carrier || canBePickedUp == false)
      return false;
   carrier = pickedUpBy;
   if (collider.attachedRigidbody)
      collider.attachedRigidbody.isKinematic = true;
   carrier.pickup = transform;
   transform.parent = carrier.pickupAttach;
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
      //transform.position += (carrier.transform.forward * -2.1f);
      //pickup.collider.attachedRigidbody.AddForce(0,200,0);
   }
   carrier.pickup = null;
   carrier = null;
   transform.parent = null;
   //Invoke("DropDelayed", 0.5f);
   DropDelayed();
}


function RemoveRigidBodies(t : Transform)
{
   for (var c : Transform in t)
      RemoveRigidBodies(c);
   Destroy(t.GetComponent(Rigidbody));
   Destroy(t.GetComponent("Pickup"));
}

function MergeChildrenTo(t : Transform, to : Transform)
{
   Debug.Log("t="+t.gameObject.name);

   for (var i : int = t.childCount-1; i >= 0; --i)
      MergeChildrenTo(t.GetChild(i), to);

   if (t.collider == null)
   {
         Debug.Log("t="+t.gameObject.name+" has NO collider");
      Destroy(t.gameObject);

   }
   else
   {
Debug.Log("t="+t.gameObject.name+" childed to "+to.gameObject.name);


      Destroy(t.GetComponent(Rigidbody));
      Destroy(t.GetComponent("Pickup"));
      t.parent = to.transform;
   }
}


static var n : int = 0;
function OnCollisionEnter(collisionInfo : Collision)
{

   // If being carried, basically just ignore collisions
   if (carrier)
      return;
/*
   // If we hit another block...
   var other : Transform = collisionInfo.collider.transform;
   if (other.gameObject.tag == "MANIP")
   {
      // Wanted to potentially make blocks automatically snap together
      // into more complex shapes if they collide from unit interaction.
      // - Thoughts on simplifying this crazy function:
      // 1. Make only single blocks pickupable by blue.
      // 2. Just handle snapping to first collider, ignore the rest

      Debug.Log("COLLISION: me="+gameObject.name+" other="+other.gameObject.name);

      //var rp : Vector3 = transform.InverseTransformPoint(other.transform.position).normalized;
      //Debug.Log("attachdir="+rp);
      //if (rp.y > rp.z && rp.y > rp.x)
      //{
      //   other.collider.attachedRigidbody.isKinematic = true;
      //   other.transform.position = transform.position + (Vector3.up * ((rp.y >= 0f) ? 3.5f : -3.5f));
      //   other.collider.attachedRigidbody.isKinematic = false;
      //}

      // Connected RigidBody - Attempt #2, making a new parent rigidbody
      //if (transform.parent == null || other.parent == null)
      //{
         // Create new parent object
         n += 1;
         var newObject = new GameObject("NewObject"+n.ToString());
         newObject.transform.position = collisionInfo.contacts[0].point;
         newObject.gameObject.layer = gameObject.layer;
         newObject.gameObject.tag = gameObject.tag;
         newObject.AddComponent(Rigidbody);

         var np : Pickup = newObject.AddComponent("Pickup");
         np.canBePickedUp = false;

         if (to.collider)
            Physics.IgnoreCollision(t.collider, to.collider, true);


         //var r : Transform = other.root;
         //RemoveRigidBodies(r);
         //r.parent = newObject.transform;
            MergeChildrenTo(transform, newObject.transform);

            MergeChildrenTo(other.transform, newObject.transform);


         //transform.parent = newObject.transform;
      //}

   }
*/
   // OLD
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
