#pragma strict

function Start () {

}

function Update () 
{
	transform.Rotate(1.0, 1.0, 0.0);
	transform.localScale = Vector3(1.0+Unit_HUD.selectedSize, 1.0+Unit_HUD.selectedSize, 1.0+Unit_HUD.selectedSize);
	renderer.material.color = Unit_HUD.selectedColor;
	//Debug.Log("test=" + HUD.vSliderValue);
}