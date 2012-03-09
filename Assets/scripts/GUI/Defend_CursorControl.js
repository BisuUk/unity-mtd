#pragma strict

var textOffsetX : float = 0.5;
var textOffsetY : float = -0.5;

private var text3d : GameObject;

function Start()
{
}

function Update()
{
   if (renderer.enabled)
   {
      // Draw ray from camera mousepoint to ground plane.
      var hit : RaycastHit;
      var mask = 1 << 9;
      var ray : Ray = Camera.main.ScreenPointToRay(Input.mousePosition);
      if (Physics.Raycast(ray.origin, ray.direction, hit, Mathf.Infinity, mask))
         transform.position = hit.point;

      // Draw cursor in accordance with HUD controls
      var scale : Vector3 = Vector3(
         Tower.baseScale.x + HUD_Defend_GUI.selectedSize + HUD_Defend_GUI.pulsateScale,
         Tower.baseScale.y + HUD_Defend_GUI.selectedSize + HUD_Defend_GUI.pulsateScale,
         Tower.baseScale.z + HUD_Defend_GUI.selectedSize + HUD_Defend_GUI.pulsateScale);
      transform.localScale = scale;
      renderer.material.color = HUD_Defend_GUI.selectedColor;
      for (var child : Transform in transform)
         child.renderer.material.color = HUD_Defend_GUI.selectedColor;
   }
}

function OnDestroy()
{
}