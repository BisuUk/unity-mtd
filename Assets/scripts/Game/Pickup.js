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
   if (t.tag == "DECAL")
   {
      return;
   }
   else if (t.tag == "WASHABLE")
   {
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
   var op : Pickup = other.GetComponent.<Pickup>();

   // If we hit another block...
   if (canMerge && carrier == null && op && op.canMerge && op.carrier == null)
   {
      // If these objects aren't merged, and not under the same parent
      if ((transform.parent == null || other.parent == null) || transform.parent != other.parent)
      {
         // Create new parent object
         n += 1;
         var newObject = new GameObject("NewObject"+n.ToString());
         newObject.transform.position = collisionInfo.contacts[0].point;
         newObject.gameObject.layer = gameObject.layer;
         newObject.gameObject.tag = gameObject.tag;
         var norb : Rigidbody = newObject.AddComponent(Rigidbody);
         // Add up mass to new rigidbody
         norb.mass = other.GetComponent(Rigidbody).mass + gameObject.GetComponent(Rigidbody).mass;

         Debug.Log("MERGING: "+gameObject.name+"+"+other.gameObject.name+"="+newObject.name);         
         // New pickup script
         var np : Pickup = newObject.AddComponent("Pickup");
         np.canBePickedUp = false;
         np.canMerge = true;

         // Remove rigidbodies and pickup scripts, reparent to newObject
         MergeChildrenTo(transform.root, newObject.transform);
         MergeChildrenTo(other.root, newObject.transform);
      }
   }
   else // Collsion objects will not merge
   {
      // Tell carrier to turn around we hit another object
      if (carrier)
         carrier.ReverseDirection();

      // Tell other carrier to turn around
      //if (op && op.carrier & carrier)
      //   carrier.ReverseDirection();
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
