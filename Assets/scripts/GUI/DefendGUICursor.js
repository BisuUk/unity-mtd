#pragma strict
#pragma downcast

var legalLocation : boolean = false;
var canAfford : boolean = false;
var tower : Tower;
var mode : int = 0;
var cursorColor : Color = Color.gray;
var LR : LineRenderer;

function Awake()
{
   tower = gameObject.GetComponent(Tower);
   LR = gameObject.GetComponent(LineRenderer);
   //Destroy(tower.FOVCollider.gameObject);
   tower.SetColor(Color.white);
   tower.SetTempEffect(0);
   if (tower.character)
      tower.character.animation.Play("idleRW");
   tower.SetChildrenMaterialColor(tower.transform, tower.constructingMaterial, Color.white, true);
   SetMode(0);
}

function SetMode(newMode : int)
{
   mode = newMode;
   tower.SetFOVMesh(tower.fov);
   if (LR)
      LR.enabled = (newMode == 2);
}

function Update()
{
   if (renderer.enabled)
   {
      // Draw ray from camera mousepoint to ground plane.
      var hit : RaycastHit;
      var mask = (1 << 10) | (1 << 4); // terrain & water

      var ray : Ray = Camera.main.ScreenPointToRay(Input.mousePosition);
      if (Physics.Raycast(ray.origin, ray.direction, hit, Mathf.Infinity, mask))
      {
         var hitPoint : Vector3 = hit.point;
         hitPoint.y += 0.5;

         // Check the location on the ground where the mouse cursor is
         // see if there's anything obstructing (anything on layer 9)
         var collider : CapsuleCollider = GetComponent(CapsuleCollider);
         var mask2 = (1 << 9); // OBSTRUCT
         legalLocation = true;

         // Draw circle around possible range
         if (mode == 0)
         {
            legalLocation = (hit.transform.gameObject.layer!=4) && (Physics.CheckCapsule(hitPoint, hitPoint, collider.radius*transform.localScale.x, mask2)==false);
            transform.position = hitPoint;
            transform.position.y += (tower.verticalOffset + tower.verticalOffset*Mathf.Lerp(tower.scaleLimits.x, tower.scaleLimits.y, tower.AdjustStrength(tower.tempStrength, true)));
            // AOE object follows cursor
            tower.FOV.transform.position = transform.position;
            tower.FOV.transform.rotation = transform.rotation;
         }
         // Draw cone of FOV
         else if (mode == 1)
         {
            if (!GUIControl.RMBDragging)
            {
               hitPoint.y = transform.position.y;
               transform.LookAt(hitPoint);
               tower.FOV.rotation = transform.rotation;
            }
         }
         else if (mode == 2)
         {
            var forwardVec : Vector3 = hitPoint-transform.position;
            if (forwardVec.magnitude <= tower.base.fovRangeLimit)
            {
               tower.FOV.transform.position = hitPoint;
               tower.FOV.transform.position.y += (tower.verticalOffset + tower.verticalOffset*Mathf.Lerp(tower.scaleLimits.x, tower.scaleLimits.y, tower.AdjustStrength(tower.tempStrength, true)));
            }
            else
            {
               var newPoint : Vector3 = transform.position + (forwardVec.normalized*tower.base.fovRangeLimit);
               newPoint.y = 25000;
               if (Physics.Raycast(newPoint, Vector3.down, hit, Mathf.Infinity, mask))
               {
                  tower.FOV.transform.position = hit.point;
                  tower.FOV.transform.position.y += (tower.verticalOffset + tower.verticalOffset*Mathf.Lerp(tower.scaleLimits.x, tower.scaleLimits.y, tower.AdjustStrength(tower.tempStrength, true)));
               }
            }
            if (LR)
            {
               LR.SetPosition(0, transform.position);
               LR.SetPosition(1, transform.position+Vector3(0,20,0));
               LR.SetPosition(2, Vector3(tower.FOV.transform.position.x, (transform.position+Vector3(0,20,0)).y, tower.FOV.transform.position.z));
               LR.SetPosition(3, tower.FOV.transform.position);
            }
         }

         // Set cursor color based on valid location (gray if invalid)
         var newColor : Color = (legalLocation && canAfford) ? DefendGUIPanel.selectedColor : Color.gray;
         if (newColor != cursorColor)
         {
            cursorColor = newColor;
            tower.SetColor(cursorColor);
         }
      }
      else
      {
         legalLocation = false;
      }


   }
}
