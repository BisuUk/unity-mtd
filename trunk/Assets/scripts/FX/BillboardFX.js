#pragma strict

var rotXOffset : float = 0.0;
var rotYOffset : float = 0.0;
var rotZOffset : float = 0.0;

function Update ()
{
   transform.LookAt(transform.position + Camera.main.transform.rotation * Vector3.back, Camera.main.transform.rotation * Vector3.up);
   transform.Rotate(Vector3(rotXOffset, rotYOffset, rotZOffset), Space.Self);
}