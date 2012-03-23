#pragma strict

function Start () {

}

function Update ()
{

   transform.LookAt(Camera.main.transform.position);
   transform.Rotate(0,180,0, Space.Self);
}