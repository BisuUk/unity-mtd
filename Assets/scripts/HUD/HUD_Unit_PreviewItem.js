#pragma strict

var origScale : Vector3;

function Start () {
	origScale = transform.localScale;
}

function Update () 
{
	transform.Rotate(1.0, 1.0, 0.0);
	transform.localScale = Vector3(origScale.x+HUD_Unit_GUI.selectedSize, origScale.y+HUD_Unit_GUI.selectedSize, origScale.z+HUD_Unit_GUI.selectedSize);
	renderer.material.color = HUD_Unit_GUI.selectedColor;
}