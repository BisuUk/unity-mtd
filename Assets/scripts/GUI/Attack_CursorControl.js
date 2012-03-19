#pragma strict

var textOffsetX : float = 0.5;
var textOffsetY : float = -0.5;
var isMouseCursor : boolean = true;
var squad : UnitSquad;
var pulsate : boolean = true;
private var text3d : GameObject;



function Start()
{
   text3d = Instantiate(Resources.Load("prefabs/CursorText3DPrefab", GameObject), Vector3.zero, Quaternion.identity);
   text3d.transform.rotation = Quaternion.Euler(90,0,0);
}

function Update()
{
   if (renderer.enabled)
   {
      if (isMouseCursor)
      {
         // Draw ray from camera mousepoint to ground plane.
         var hit : RaycastHit;
         var mask = 1 << 9;
         var ray : Ray = Camera.main.ScreenPointToRay(Input.mousePosition);
         if (Physics.Raycast(ray.origin, ray.direction, hit, Mathf.Infinity, mask))
            transform.position = hit.point;
      }

      // Draw cursor in accordance with HUD controls
      var scale : Vector3 = Vector3(
         Unit.baseScale.x + squad.size + ((pulsate) ? HUD_Attack_GUI.pulsateScale : 0.0),
         Unit.baseScale.y + squad.size + ((pulsate) ? HUD_Attack_GUI.pulsateScale : 0.0),
         Unit.baseScale.z + squad.size + ((pulsate) ? HUD_Attack_GUI.pulsateScale : 0.0));
      transform.localScale = scale;
      renderer.material.color = squad.color;

      // Draw squad count index next to cursor
      if (squad.count > 1)
      {
         text3d.renderer.enabled = true;
         text3d.renderer.material.color = squad.color;
         text3d.transform.position = transform.position;
         text3d.transform.position.x += textOffsetX;
         text3d.transform.position.z += textOffsetY;
         text3d.GetComponent(TextMesh).text = "x"+squad.count.ToString();
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