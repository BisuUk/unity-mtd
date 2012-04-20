#pragma strict
#pragma downcast

var tower : Tower;

function Start()
{
   tower = gameObject.GetComponent(Tower);
}

function Update()
{
   // Spin the item
	transform.Rotate(0.0, 50.0*Time.deltaTime, 0.0);
	//transform.localScale = Vector3(
   //   Unit.baseScale.x + DefendGUI.selectedSize,
   //   Unit.baseScale.y + DefendGUI.selectedSize,
   //   Unit.baseScale.z + DefendGUI.selectedSize);
	renderer.material.color = DefendGUIPanel.selectedColor;
   for (var child : Transform in transform)
      child.renderer.material.color = DefendGUIPanel.selectedColor;
}