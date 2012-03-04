#pragma strict


function Start ()
{
   renderer.enabled = false;
}

function Update () 
{
	transform.Rotate(1.0, 1.0, 0.0);
	transform.localScale = Vector3(Unit.baseScale.x+HUD_Unit_GUI.selectedSize, Unit.baseScale.y+HUD_Unit_GUI.selectedSize, Unit.baseScale.z+HUD_Unit_GUI.selectedSize);
	renderer.material.color = HUD_Unit_GUI.selectedColor;
}