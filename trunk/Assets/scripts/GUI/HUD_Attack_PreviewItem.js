#pragma strict


function Update()
{
   // Spin the item
	transform.Rotate(50.0*Time.deltaTime, 50.0*Time.deltaTime, 0.0);
	transform.localScale = Vector3(
      Unit.baseScale.x + HUD_Attack_GUI.selectedSize,
      Unit.baseScale.y + HUD_Attack_GUI.selectedSize,
      Unit.baseScale.z + HUD_Attack_GUI.selectedSize);
	renderer.material.color = HUD_Attack_GUI.selectedColor;
}