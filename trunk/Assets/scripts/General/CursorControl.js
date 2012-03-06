#pragma strict

var text3d : Transform;
var textOffsetX : float;
var textOffsetY : float;

private var pulsateScale : float = 0.0;
private var pulsateUp : boolean;

function Show(showVal : boolean)
{
   renderer.enabled = showVal;
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
      // Draw ray from camera mousepoint to ground plane.
      var hit : RaycastHit;
      var mask = 1 << 9;
      var ray : Ray = Camera.main.ScreenPointToRay(Input.mousePosition);
      if (Physics.Raycast(ray.origin, ray.direction, hit, Mathf.Infinity, mask))
         transform.position = hit.point;

      // Cursor pulsate params
      if (pulsateUp)
         pulsateScale += 0.004;
      else
         pulsateScale -= 0.004;
   
      if (pulsateScale > 0.07)
         pulsateUp = false;
      else if (pulsateScale < 0.0)
         pulsateUp = true;

      // Draw cursor in accordance with HUD controls
      var scale : Vector3 = Vector3(
         Unit.baseScale.x + HUD_Unit_GUI.selectedSize + pulsateScale,
         Unit.baseScale.y+HUD_Unit_GUI.selectedSize + pulsateScale,
         Unit.baseScale.z+HUD_Unit_GUI.selectedSize + pulsateScale);
      transform.localScale = scale;
      renderer.material.color = HUD_Unit_GUI.selectedColor;

      // Draw squad count index next to cursor
      if (HUD_Unit_GUI.selectedCount > 1)
      {
         text3d.renderer.enabled = true;
         text3d.renderer.material.color = HUD_Unit_GUI.selectedColor;
         text3d.position = transform.position;
         text3d.position.x += textOffsetX;
         text3d.position.z += textOffsetY;
         text3d.GetComponent(TextMesh).text = "x"+HUD_Unit_GUI.selectedCount.ToString();
      }
      else // Selected squad has < 2 units
      {
         text3d.renderer.enabled = false;
      }
   }
   else // Cursor not visible
   {
      text3d.renderer.enabled = false;
   }
}