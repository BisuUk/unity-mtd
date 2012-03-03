#pragma strict

var text3d : Transform;
var textOffsetX : float;
var textOffsetY : float;

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
   text3d.renderer.enabled = false;
}

function Update ()
{
   if (renderer.enabled)
   {
      if (pulsateUp)
         pulsateScale += 0.004;
      else
         pulsateScale -= 0.004;
   
      if (pulsateScale > 0.07)
         pulsateUp = false;
      else if (pulsateScale < 0.0)
         pulsateUp = true;
   
      var scale : Vector3 = new Vector3(
         origScale.x + HUD_Unit_GUI.selectedSize + pulsateScale,
         origScale.y+HUD_Unit_GUI.selectedSize + pulsateScale,
         origScale.z+HUD_Unit_GUI.selectedSize + pulsateScale);
   
      transform.localScale = scale;
      renderer.material.color = HUD_Unit_GUI.selectedColor;
   
      if (HUD_Unit_GUI.selectedCount > 1)
      {
         text3d.renderer.enabled = true;
         text3d.renderer.material.color = HUD_Unit_GUI.selectedColor;
         text3d.position = transform.position;
         text3d.position.x += textOffsetX;
         text3d.position.z += textOffsetY;
         text3d.GetComponent(TextMesh).text = "x"+HUD_Unit_GUI.selectedCount.ToString();
      }
      else
      {
         text3d.renderer.enabled = false;
      }
   }
   else
   {
      text3d.renderer.enabled = false;
   }
}