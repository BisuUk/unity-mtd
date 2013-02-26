#pragma strict

var owner : UnitSimple;


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
   Invoke("DropDelayed", 0.5f);
}

function OnCollisionEnter(collisionInfo : Collision)
{
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
