#pragma strict

var originalMass : float;
var owner : UnitSimple;


function Start ()
{
   if (collider.attachedRigidbody)
      originalMass = collider.attachedRigidbody.mass;
}

function Pickup(pickedUpBy : UnitSimple)
{
   if (owner)
      return;
   owner = pickedUpBy;
   if (collider.attachedRigidbody)
   {
      collider.attachedRigidbody.isKinematic = true;
      collider.attachedRigidbody.mass = 0.0001;
   }
   owner.pickup = transform;
   transform.parent = owner.pickupAttach;
   transform.localPosition = Vector3.zero;
            //pickup.collider.enabled = false;
}

function Drop()
{
   if (collider.attachedRigidbody)
   {
      transform.rotation = Quaternion.identity;
      //transform.position = transform.position;
      //transform.position.y += 5.0f;
      transform.position += (owner.transform.forward * -2.1f);
      collider.attachedRigidbody.mass = originalMass;
      collider.attachedRigidbody.isKinematic = false;

      owner.isStopped = false;

      //pickup.collider.attachedRigidbody.AddForce(0,200,0);
   }
   owner.pickup = null;
   owner = null;
   transform.parent = null;
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

         //unit.ReverseDirection();
         //Drop();
         unit.DropPickup();
         //unit.isStopped = true;
         Debug.Log("HIT WHILE CARRYING");
         }
      }
   }
}


function OnTriggerEnter(other : Collider)
{

   if (transform.parent)
   {
      var unit : UnitSimple = transform.root.GetComponentInChildren(UnitSimple);
      if (unit)
      {

         var transformedHP : Vector3 = unit.transform.InverseTransformPoint(other.transform.position);

         if (transformedHP.z > 0.0)
         {
            //unit.ReverseDirection();
            //unit.isStopped = true;
            unit.DropPickup();
            //Drop();
            Debug.Log("HIT WHILE CARRYING T");
         }
      }
   }

}
