#pragma strict

private var origScale : Vector3 = Vector3(0.25,0.25,0.25);

function Hide()
{
   renderer.enabled = false;
}

function Show()
{
   renderer.enabled = true;
}

function Start ()
{
   renderer.enabled = false;
}

function Update ()
{
   transform.localScale = Vector3(origScale.x+HUD_Unit_GUI.selectedSize, origScale.y+HUD_Unit_GUI.selectedSize, origScale.z+HUD_Unit_GUI.selectedSize);
   renderer.material.color = HUD_Unit_GUI.selectedColor;
}