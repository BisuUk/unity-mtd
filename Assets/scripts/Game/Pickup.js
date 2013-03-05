#pragma strict
#pragma downcast

var carrier : UnitSimple;
var canBePickedUp : boolean;
var canMerge : boolean;

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

   SetIgnoreCarrierCollision(transform, true);

   carrier.pickup = transform;
   transform.parent = carrier.pickupAttach;
   transform.localPosition = Vector3.zero;
   transform.rotation = Quaternion.identity;
   //collider.enabled = false;
   return true;
}

function Drop()
{
   SetIgnoreCarrierCollision(transform, false);
   //transform.position.y += 0.001f; // wake up physics
   collider.attachedRigidbody.isKinematic = false;
   carrier = null;
   transform.parent = null;
}

function SetIgnoreCarrierCollision(t : Transform, ignore : boolean)
{
   for (var c : Transform in t)
      SetIgnoreCarrierCollision(c, ignore);
   if (t.collider)
      Physics.IgnoreCollision(t.collider, carrier.collider, ignore);
}

function MergeChildrenTo(t : Transform, to : Transform)
{
   if (t.tag == "DECAL") // remove any paint splats
   {
      Debug.Log("found decal:"+t.gameObject.name);
      return;

   }
   else if (t.tag == "WASHABLE")
   { // remove any paint splats
      t.parent = to.transform;
      return;
   }
   else
   {
      //Debug.Log("t="+t.gameObject.name);
      for (var i : int = t.childCount-1; i >= 0; --i)
         MergeChildrenTo(t.GetChild(i), to);
   }

   if (t.collider == null)
   {
      //Debug.Log("t="+t.gameObject.name+" has NO collider");
      Destroy(t.gameObject);
   }
   else
   {
      //Debug.Log("t="+t.gameObject.name+" childed to "+to.gameObject.name);
      //to.GetComponent.<Rigidbody>().mass += t.collider.attachedRigidbody.mass;
      Destroy(t.GetComponent(Rigidbody));
      Destroy(t.GetComponent("Pickup"));
      t.parent = to.transform;
   }
}

static var n : int = 0;
function OnCollisionEnter(collisionInfo : Collision)
{
   var other : Transform = collisionInfo.collider.transform;
   //Debug.Log("COLLISION: me="+gameObject.name+" other="+other.gameObject.name);

   // If we hit another block...
   if (gameObject.tag == "MANIP" && other.gameObject.tag == "MANIP")
   {
      // Tell carrier to turn around we hit another object
      if (carrier)
      {
         if (carrier)
            carrier.ReverseDirection();
         return;
      }

      // Tell carrier to turn around we hit another object
      var op : Pickup = other.GetComponent.<Pickup>();
      if (op.carrier)
      {
         if (carrier)
            carrier.ReverseDirection();
         return;
      }

      // Wanted to potentially make blocks automatically snap together
      // into more complex shapes if they collide from unit interaction.
      // - Thoughts on simplifying this crazy function:
      // 1. Make only single blocks pickupable by blue.
      // 2. Just handle snapping to first collider, ignore the rest
      //var rp : Vector3 = transform.InverseTransformPoint(other.transform.position).normalized;
      //Debug.Log("attachdir="+rp);
      //if (rp.y > rp.z && rp.y > rp.x)
      //{
      //   other.collider.attachedRigidbody.isKinematic = true;
      //   other.transform.position = transform.position + (Vector3.up * ((rp.y >= 0f) ? 3.5f : -3.5f));
      //   other.collider.attachedRigidbody.isKinematic = false;
      //}

      Debug.Log("COLLISION: me="+gameObject.name+" other="+other.gameObject.name);

      // Connected RigidBody - Attempt #2, making a new parent rigidbody
      if (canMerge && op.canMerge)
      {
         if ((transform.parent == null || other.parent == null) || transform.parent != other.parent)
         {
            // Create new parent object
            n += 1;
            var newObject = new GameObject("NewObject"+n.ToString());
            newObject.transform.position = collisionInfo.contacts[0].point;
            newObject.gameObject.layer = gameObject.layer;
            newObject.gameObject.tag = gameObject.tag;
            var norb : Rigidbody = newObject.AddComponent(Rigidbody);
   
            norb.mass = other.GetComponent(Rigidbody).mass + gameObject.GetComponent(Rigidbody).mass;
   
            var np : Pickup = newObject.AddComponent("Pickup");
            np.canBePickedUp = false;
            np.canMerge = true;
   
            // Remove rigidbodies and pickup scripts, reparent to newObject
            MergeChildrenTo(transform.root, newObject.transform);
            MergeChildrenTo(other.root, newObject.transform);
         }
      }

   }
/*
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
*/
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
