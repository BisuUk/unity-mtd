#pragma strict


function Update()
{
   // Spin the item
	transform.Rotate(0.0, 1.0, 0.0);
	transform.localScale = Vector3(
      Unit.baseScale.x + HUD_Defend_GUI.selectedSize,
      Unit.baseScale.y + HUD_Defend_GUI.selectedSize,
      Unit.baseScale.z + HUD_Defend_GUI.selectedSize);
	renderer.material.color = HUD_Defend_GUI.selectedColor;
   for (var child : Transform in transform)
   {
      child.renderer.material.color = HUD_Defend_GUI.selectedColor;
   }

}