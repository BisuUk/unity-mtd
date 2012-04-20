#pragma strict
#pragma downcast

var legalLocation : boolean = false;
var tower : Tower;
var mode : int = 0;

function Awake()
{
   tower = gameObject.GetComponent(Tower);
}

function Update()
{
   if (renderer.enabled)
   {
      // Draw ray from camera mousepoint to ground plane.
      var hit : RaycastHit;
      var mask = (1 << 2); // IGNORE RAYCAST layer (ironic, I know)

      var cursorColor : Color = Color.gray;

      var ray : Ray = Camera.main.ScreenPointToRay(Input.mousePosition);
      if (Physics.Raycast(ray.origin, ray.direction, hit, Mathf.Infinity, mask))
      {
         var hitPoint : Vector3 = hit.point;

         // Check the location on the ground where the mouse cursor is
         // see if there's anything obstructing (anything on layer 10)
         var collider : SphereCollider = GetComponent(SphereCollider);
         var mask2 = (1 << 9); // OBSTRUCT
         legalLocation = (Physics.CheckSphere(hitPoint, collider.radius*transform.localScale.x, mask2)==false);

         // Draw circle around possible range
         if (mode == 0)
         {
            transform.position = hitPoint;
            tower.SetAOEMesh(360);
         }
         // Draw cone of FOV
         else //if (mode == 1)
         {
            legalLocation = true; // rotating so it's already placed
            transform.LookAt(hitPoint);
            tower.SetAOEMesh(tower.fov);
         }

         // Set cursor color based on valid location (gray if invalid)
         cursorColor = (legalLocation) ? tower.color : Color.gray;
         tower.AOE.renderer.material.color = cursorColor;
         tower.AOE.renderer.material.color.a = 0.3;
         renderer.material.color = cursorColor;
         for (var child : Transform in transform)
         {
            //if (child != infoPlane && child != AOE)
               child.renderer.material.color = cursorColor;
         }
         //lineRenderer.SetColors(cursorColor, cursorColor);
      }
      else
      {
         legalLocation = false;
      }

      // AOE object follows cursor
      tower.AOE.transform.position = transform.position;
      tower.AOE.transform.rotation = transform.rotation;
   }
}
