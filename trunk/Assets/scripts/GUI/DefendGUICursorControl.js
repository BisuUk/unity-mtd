#pragma strict
#pragma downcast


var mode : int = 0;
var range : float;
var fov : float = 90.0;
var lineRenderer : LineRenderer;
var legalLocation : boolean = false;

function Start()
{
   lineRenderer = GetComponent(LineRenderer);
   lineRenderer.material = new Material(Shader.Find("Particles/Additive"));
}


function DrawFOV()
{
   var stride : float = 10.0;
   var indexCounter : int = 1;
   var i : float = 0;
   var r : Quaternion;

   lineRenderer.enabled = true;
   lineRenderer.SetVertexCount(fov/stride+3);

   lineRenderer.SetPosition(0, transform.position);
   indexCounter = 1;
   for (i=-fov/2.0; i<=fov/2.0; i+=stride)
   {
      r = transform.rotation;
      r *= Quaternion.Euler(0, i, 0);
      lineRenderer.SetPosition(indexCounter, transform.position + (r*Vector3(0,0,1)*range));
      indexCounter += 1;
   }
   lineRenderer.SetPosition(indexCounter, transform.position);
}


function DrawRange()
{
   var stride : float = 10.0;
   var indexCounter : int = 1;
   var i : float = 0;
   var r : Quaternion;

   lineRenderer.enabled = true;
   lineRenderer.SetVertexCount(360.0/stride+1);
   indexCounter = 0;

   r = transform.rotation;
   for (i=0.0; i<=360.0; i+=stride)
   {
      r *= Quaternion.Euler(0, stride, 0);
      lineRenderer.SetPosition(indexCounter, transform.position + (r*Vector3(0,0,1)*range));
      indexCounter += 1;
   }
}

function Update()
{
   if (renderer.enabled)
   {
      // Draw ray from camera mousepoint to ground plane.
      var hit : RaycastHit;
      var mask = (1 << 9) | (1 << 10);

      var cursorColor : Color = Color.gray;

      var ray : Ray = Camera.main.ScreenPointToRay(Input.mousePosition);
      if (Physics.Raycast(ray.origin, ray.direction, hit, Mathf.Infinity, mask))
      {
         legalLocation = (hit.transform.gameObject.layer == 10); // TOWER ZONE

         // Draw circle around possible range
         if (mode == 0)
         {
            transform.position = hit.point;
            DrawRange();
         }
         // Draw cone of FOV
         else //if (mode == 1)
         {
            legalLocation = true; // rotating so it's already placed
            transform.LookAt(hit.point);
            DrawFOV();
         }

         cursorColor = (legalLocation) ? DefendGUI.selectedColor : Color.gray;
         lineRenderer.SetColors(cursorColor, cursorColor);
      }
      else
      {
         legalLocation = false;
      }

      // Draw cursor in accordance with HUD controls
      //var scale : Vector3 = Vector3(
      //   Tower.baseScale.x + HUD_Defend_GUI.selectedSize + HUD_Defend_GUI.pulsateScale,
      //   Tower.baseScale.y + HUD_Defend_GUI.selectedSize + HUD_Defend_GUI.pulsateScale,
      //   Tower.baseScale.z + HUD_Defend_GUI.selectedSize + HUD_Defend_GUI.pulsateScale);
      //transform.localScale = scale;
      renderer.material.color = cursorColor;
      for (var child : Transform in transform)
         child.renderer.material.color = cursorColor;
   }
}

function OnDestroy()
{
}

function SetRange(newRange : float)
{
   range = newRange;
   if (range < Tower.baseRange)
      range = Tower.baseRange;
}
