#pragma strict

private var origScale : Vector3 = Vector3(0.25,0.25,0.25); // get from HUD
private var pulsateScale : float = 0.0;
private var pulsateUp : boolean;

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
   if (pulsateUp)
      pulsateScale += 0.007;
   else
      pulsateScale -= 0.007;

   if (pulsateScale > 0.08)
      pulsateUp = false;
   else if (pulsateScale < 0.0)
      pulsateUp = true;

   var scale : Vector3 = new Vector3(
      origScale.x + HUD_Unit_GUI.selectedSize + pulsateScale,
      origScale.y+HUD_Unit_GUI.selectedSize + pulsateScale,
      origScale.z+HUD_Unit_GUI.selectedSize + pulsateScale);

   transform.localScale = scale;
   renderer.material.color = HUD_Unit_GUI.selectedColor;
}