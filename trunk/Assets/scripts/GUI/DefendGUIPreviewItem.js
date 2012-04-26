#pragma strict
#pragma downcast

var tower : Tower;

private function SetChildrenLayer(t : Transform, layer : int)
{
   t.gameObject.layer = layer;
   for (var child : Transform in t)
   {
      SetChildrenLayer(child, layer);
   }
}

function Start()
{
   tower = gameObject.GetComponent(Tower);
   SetChildrenLayer(transform, 8);
}


function Update()
{
   // Spin the item
	transform.Rotate(0.0, 50.0*Time.deltaTime, 0.0);
	//transform.localScale = Vector3(
   //   Unit.baseScale.x + DefendGUI.selectedSize,
   //   Unit.baseScale.y + DefendGUI.selectedSize,
   //   Unit.baseScale.z + DefendGUI.selectedSize);
   tower.SetColor(DefendGUIPanel.selectedColor);
}