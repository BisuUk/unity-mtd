#pragma strict

var rotXOffset : float = 0.0;
var rotYOffset : float = 0.0;
var rotZOffset : float = 0.0;

var cameraToLookAt: Camera;

function Update ()
{
   // Maybe set in the inspector?
   cameraToLookAt = Camera.main;

   //transform.LookAt(transform.position + Camera.main.transform.rotation * Vector3.back, Camera.main.transform.rotation * Vector3.up);
   //transform.rotation = cameraToLookAt.camera.transform.rotation;
   //transform.rotation.SetLookRotation(cameraToLookAt.transform.forward, cameraToLookAt.transform.up);

   transform.rotation = Quaternion.LookRotation(cameraToLookAt.transform.forward);
   transform.Rotate(Vector3(rotXOffset, rotYOffset, rotZOffset), Space.Self);
}