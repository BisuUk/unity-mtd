#pragma strict

var squad : UnitSquad;
private var origScale : Vector3;

function Start()
{
   origScale = transform.localScale;
}


function Update()
{
   if (squad)
   {
      // Spin the item
   	transform.Rotate(50.0*Time.deltaTime, 50.0*Time.deltaTime, 0.0);
   	transform.localScale = origScale*(1+squad.size);
	   renderer.material.color = squad.color;
   }
}