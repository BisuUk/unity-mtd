#pragma strict

var mode : int = 0;
var lineRenderer : LineRenderer;
var range : float;
var fov : float = 90.0;

function Start()
{
   lineRenderer = GetComponent(LineRenderer);
   lineRenderer.material = new Material(Shader.Find("Particles/Additive"));
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
      {
         if (mode == 0)
            transform.position = hit.point;
         else if (mode == 1)
         {
            transform.LookAt(hit.point);
            var r1 : Quaternion = transform.rotation.AngleAxis(45, Vector3.up);
            var r2 : Quaternion = transform.rotation.AngleAxis(-45, Vector3.up);

            //Debug.Log("r="+transform.rotation);
            lineRenderer.SetPosition(0, transform.position);
            lineRenderer.SetPosition(1, transform.position + (r1*Vector3(0,0,1)*range));
            lineRenderer.SetPosition(2, transform.position + (r2*Vector3(0,0,1)*range));
            lineRenderer.SetPosition(3, transform.position);
         }
      }

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