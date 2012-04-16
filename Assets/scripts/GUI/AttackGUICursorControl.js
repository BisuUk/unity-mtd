#pragma strict

var textOffsetX : float = 0.5;
var textOffsetY : float = -0.5;
var isMouseCursor : boolean = true;
var unitType : int;
var size : float;
var color : Color;
var indexNumber : int;
var pulsate : boolean = true;
private var text3d : Transform;
private var origScale : Vector3;
private static var text3dPrefab : Transform;

function Start()
{
   if (text3dPrefab==null)
      text3dPrefab = Resources.Load("prefabs/fx/Text3DPrefab", Transform);
   text3d = Instantiate(text3dPrefab, Vector3.zero, Quaternion.identity);
   text3d.rotation = Quaternion.Euler(90,0,0);
   origScale = transform.localScale;
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
            transform.position = hit.point; //+ (ray.direction*(AttackGUI.groundPlaneOffset-1.0));
      }

      // Draw cursor in accordance with HUD controls
      var scale : Vector3 = Vector3(
         origScale.x + size + ((pulsate) ? GUIControl.pulsateScale : 0.0),
         origScale.y + size + ((pulsate) ? GUIControl.pulsateScale : 0.0),
         origScale.z + size + ((pulsate) ? GUIControl.pulsateScale : 0.0));
      transform.localScale = scale;
      renderer.material.color = color;

      // Draw squad count index next to cursor
      if (indexNumber > 1)
      {
         textOffsetX=size+0.1;
         textOffsetY=-size-0.1;
         text3d.renderer.enabled = true;
         text3d.renderer.material.color = color;
         text3d.transform.position = transform.position + (Camera.main.transform.up*textOffsetY) + (Camera.main.transform.right*textOffsetX);
         text3d.GetComponent(TextMesh).text = "x"+indexNumber.ToString();
      }
      else // Selected squad has < 2 units
      {
         text3d.renderer.enabled = false;
      }
   }
   else // no renderering gameObject
   {
      text3d.renderer.enabled = false;
   }
}

function setFromSquad(squad : UnitSquad)
{
   unitType = squad.unitType;
   size = squad.size;
   color = squad.color;
   indexNumber = (isMouseCursor) ? squad.count : squad.unitsToDeploy;
}

function OnDestroy()
{
   if (text3d)
      Destroy(text3d.gameObject);
}