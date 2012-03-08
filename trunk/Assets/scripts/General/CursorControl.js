#pragma strict

var textOffsetX : float = 0.5;
var textOffsetY : float = -0.5;

private var text3d : GameObject;

function Start()
{
   text3d = Instantiate(Resources.Load("CursorText3DPrefab", GameObject), Vector3.zero, Quaternion.identity);
   text3d.transform.rotation = Quaternion.Euler(90,0,0);
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
         Unit.baseScale.x + HUD_Unit_GUI.selectedSize + HUD_Unit_GUI.pulsateScale,
         Unit.baseScale.y + HUD_Unit_GUI.selectedSize + HUD_Unit_GUI.pulsateScale,
         Unit.baseScale.z + HUD_Unit_GUI.selectedSize + HUD_Unit_GUI.pulsateScale);
      transform.localScale = scale;
      renderer.material.color = HUD_Unit_GUI.selectedColor;

      // Draw squad count index next to cursor
      if (HUD_Unit_GUI.selectedCount > 1)
      {
         text3d.renderer.enabled = true;
         text3d.renderer.material.color = HUD_Unit_GUI.selectedColor;
         text3d.transform.position = transform.position;
         text3d.transform.position.x += textOffsetX;
         text3d.transform.position.z += textOffsetY;
         text3d.GetComponent(TextMesh).text = "x"+HUD_Unit_GUI.selectedCount.ToString();
      }
      else // Selected squad has < 2 units
      {
         text3d.renderer.enabled = false;
      }

   }
   else // Selected squad has < 2 units
   {
      text3d.renderer.enabled = false;
   }
}

function OnDestroy()
{
   if (text3d)
      Destroy(text3d);
}