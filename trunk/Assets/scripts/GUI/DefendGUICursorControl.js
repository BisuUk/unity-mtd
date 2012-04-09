#pragma strict
#pragma downcast


var mode : int = 0;
var range : float;
var fov : float = 90.0;
//var lineRenderer : LineRenderer;
var legalLocation : boolean = false;

var meshFilterFOV : MeshFilter;
var meshRenderFOV: MeshRenderer;
var meshFOV : Mesh;
var meshFOVObject : GameObject;

function Awake()
{
   //lineRenderer = GetComponent(LineRenderer);
   //lineRenderer.material = new Material(Shader.Find("Particles/Additive"));
   meshFOVObject = transform.FindChild("FOV").gameObject;
   meshFilterFOV = meshFOVObject.GetComponent(MeshFilter);
   meshRenderFOV = meshFOVObject.GetComponent(MeshRenderer);
   meshRenderFOV.material = new Material(Shader.Find("Transparent/Diffuse"));

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
            CreateFOVMesh(360);
         }
         // Draw cone of FOV
         else //if (mode == 1)
         {
            legalLocation = true; // rotating so it's already placed
            transform.LookAt(hit.point);
            CreateFOVMesh(fov);
         }

         // Set cursor color based on valid location (gray if invalid)
         cursorColor = (legalLocation) ? DefendGUI.selectedColor : Color.gray;
         //lineRenderer.SetColors(cursorColor, cursorColor);
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
      meshRenderFOV.material.color.a = 0.3;

   }
}


function SetRange(newRange : float)
{
   range = newRange;
   if (range < Tower.baseRange)
      range = Tower.baseRange;

   if (meshFOVObject != null)
   {
      meshFOVObject.transform.localScale = Vector3(range,range,range);
   }
}


private var lastFOV = -1;
function SetFOV(newFOV : float)
{
   fov = newFOV;
   // If FOV changes, make new mesh
   if (fov != lastFOV)
   {
      CreateFOVMesh(fov);
      lastFOV = fov;
   }
}


function CreateFOVMesh(newFOV : float)
{
   var x : int; //Counter
   var stride : float = 10.0;

   //Create a new mesh
   if (meshFOV == null)
      meshFOV = new Mesh();
   else
      meshFOV.Clear();

   //Vertices
   var vertex = new Vector3[newFOV/stride+3];

   vertex[0] = Vector3.zero;
   var r : Quaternion;
   var i = 1;
   for (x=-newFOV/2.0; x<=newFOV/2.0; x+=stride)
   {
      r = Quaternion.identity;
      r *= Quaternion.Euler(0, x, 0);
      vertex[i] = ((r*Vector3(0,0,1)*range));
      i += 1;
   }

   //UVs
   var uvs = new Vector2[vertex.length];
   for(x = 0; x < vertex.length; x++)
   {
      uvs[x] =  ((x%2) == 0) ? Vector2(0,0) : Vector2(1,1);
   }

   //Triangles
   var tris = new int[3 * (vertex.length - 2)];    //3 verts per triangle * num triangles
   var C1 : int = 0;
   var C2 : int = 1;
   var C3 : int = 2;

   for(x = 0; x < tris.length; x+=3)
   {
      tris[x] = C1;
      tris[x+1] = C2;
      tris[x+2] = C3;
      C2++;
      C3++;
   }

   //Assign data to mesh
   meshFOV.vertices = vertex;
   meshFOV.uv = uvs;
   meshFOV.triangles = tris;

   //Recalculations
   meshFOV.RecalculateNormals();
   meshFOV.RecalculateBounds();
   meshFOV.Optimize();

   //Name the mesh
   meshFOV.name = "FOVMesh";
   meshFilterFOV.mesh = meshFOV;
}