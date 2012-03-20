#pragma strict

private var origScale : Vector3;

function Start()
{
   origScale = transform.localScale;
}


function Update()
{
   // Spin the item
	transform.Rotate(50.0*Time.deltaTime, 50.0*Time.deltaTime, 0.0);
	transform.localScale = Vector3(
      origScale.x + HUD_Attack_GUI.selectedSize,
      origScale.y + HUD_Attack_GUI.selectedSize,
      origScale.z + HUD_Attack_GUI.selectedSize);
	renderer.material.color = HUD_Attack_GUI.selectedColor;
}