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
      origScale.x + AttackGUI.selectedSize,
      origScale.y + AttackGUI.selectedSize,
      origScale.z + AttackGUI.selectedSize);
	renderer.material.color = AttackGUI.selectedColor;
}