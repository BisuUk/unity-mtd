#pragma strict

function Start () {

}

function Update ()
{
   // On rate interval
      // Check queue contents
      // Launch unit of squad type
      // if top squad count = 0
        // pop squad off queue
}

function OnMouseDown()
{
   renderer.material.color = Color.green;
   //Debug.Log("ONMOUSEDOWN");
}

function OnMouseEnter()
{
   renderer.material.color = Color.red;
   //Debug.Log("ONMOUSEENTER");
}

function OnMouseExit()
{
   renderer.material.color = Color.white;
}