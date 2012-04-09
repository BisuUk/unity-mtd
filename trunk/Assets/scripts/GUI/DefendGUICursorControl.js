#pragma strict
#pragma downcast


var mode : int = 0;
var range : float;
var fov : float = 90.0;
var legalLocation : boolean = false;
//var lineRenderer : LineRenderer;
private var AOEMeshFilter : MeshFilter;
private var AOEMeshRender: MeshRenderer;
private var AOEObject : GameObject;



function Awake()
{
   AOEObject = transform.FindChild("AOE").gameObject;
   AOEMeshFilter = AOEObject.GetComponent(MeshFilter);
   AOEMeshRender = AOEObject.GetComponent(MeshRenderer);
   AOEMeshRender.material = new Material(Shader.Find("Transparent/Diffuse"));
   //lineRenderer = GetComponent(LineRenderer);
   //lineRenderer.material = new Material(Shader.Find("Particles/Additive"));
}


function Update()
{
   if (renderer.enabled)
   {
      // Draw ray from camera mousepoint to ground plane.
      var hit : RaycastHit;
      var mask = (1 << 9);// | (1 << 10);

      var cursorColor : Color = Color.gray;

      var ray : Ray = Camera.main.ScreenPointToRay(Input.mousePosition);
      if (Physics.Raycast(ray.origin, ray.direction, hit, Mathf.Infinity, mask))
      {
         // Check the location on the ground where the mouse cursor is
         // see if there's anything obstructing (anything on layer 10)
         var collider : SphereCollider = GetComponent(SphereCollider);
         var mask2 = (1 << 10); // BLOCKS
         legalLocation = (Physics.CheckSphere(hit.point, collider.radius*transform.localScale.x, mask2)==false);

         // Draw circle around possible range
         if (mode == 0)
         {
            transform.position = hit.point;
            SetAOEMesh(360);
         }
         // Draw cone of FOV
         else //if (mode == 1)
         {
            legalLocation = true; // rotating so it's already placed
            transform.LookAt(hit.point);
            SetAOEMesh(fov);
         }

         // Set cursor color based on valid location (gray if invalid)
         cursorColor = (legalLocation) ? DefendGUI.selectedColor : Color.gray;
         //lineRenderer.SetColors(cursorColor, cursorColor);
      }
      else
      {
         legalLocation = false;
      }

      // Set color of model
      renderer.material.color = cursorColor;
      for (var child : Transform in transform)
         child.renderer.material.color = cursorColor;
      AOEMeshRender.material.color.a = 0.3; // transparent
   }
}


function SetRange(newRange : float)
{
   range = newRange;
   if (range < Tower.baseRange)
      range = Tower.baseRange;

   AOEObject.transform.localScale = Vector3.one*range;
}


function SetFOV(newFOV : float)
{
   fov = newFOV;
   SetAOEMesh(fov);
}

private var lastAOE = -1;
function SetAOEMesh(newAOE : float)
{
   if (lastAOE != newAOE)
   {
      AOEMeshFilter.mesh = Tower.CreateAOEMesh(newAOE, 1.0/transform.localScale.x);
      lastAOE = newAOE;
   }
}



/*
function SetLineFOV()
{

   var stride : float = 10.0;
   var indexCounter : int = 1;
   var i : float = 0;
   var r : Quaternion;


   lineRenderer.enabled = true;
   lineRenderer.SetColors(renderer.material.color,renderer.material.color);
   lineRenderer.SetVertexCount(fov/stride+3);

   lineRenderer.SetPosition(0, transform.position);
   indexCounter = 1;
   for (i=-fov/2.0; i<=fov/2.0; i+=stride)
   {
      r = Quaternion.identity;
      r *= Quaternion.Euler(0, i, 0);
      lineRenderer.SetPosition(indexCounter, transform.position + (r*Vector3(0,0,1)*range));
      indexCounter += 1;
   }
   lineRenderer.SetPosition(indexCounter, transform.position);
}
*/