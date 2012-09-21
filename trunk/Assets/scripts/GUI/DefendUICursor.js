#pragma strict
#pragma downcast

var legalLocation : boolean = false;
var canAfford : boolean = true;
var tower : Tower;
var mode : int = 0;
var cursorColor : Color = Color.black;

private var lastTrajectoryPos : Vector3;
private var nextTrajectoryTime : float;
private var shotFX : Transform;
private var obstructionCount : int = 0;

function Awake()
{
   tower = gameObject.GetComponent(Tower);
   //Destroy(tower.FOVCollider.gameObject);
   tower.SetColor(Color.white, false);
   if (tower.character)
      tower.character.animation.Play("idleRW");
   tower.SetChildrenMaterialColor(tower.transform, tower.constructingMaterial, Color.white, true);
   SetMode(0);
   collider.enabled = true;
   collider.isTrigger = true;
}

function PrevMode() : boolean
{
   if (mode == 0)
      return true;
   SetMode(0);
   return false;
}

function NextMode() : boolean
{
   var ret : boolean = false;
   if (mode == 0)
   {
      if (tower.placeWithOrient)
         SetMode(1);
      else if (tower.placeFOV)
         SetMode(2);
      else
         ret = true;
   }
   else
   {
      ret = true;
   }
   return ret;
}

function SetMode(newMode : int)
{
   mode = newMode;
   tower.SetFOVMesh(tower.fov);
   if (shotFX)
      Destroy(shotFX.gameObject);
}

function Update()
{
   // Draw ray from camera mousepoint to ground plane.
   var hit : RaycastHit;
   var mask = (1 << 10) | (1 << 4); // terrain & water

   var ray : Ray = Camera.main.ScreenPointToRay(Input.mousePosition);
   if (Physics.Raycast(ray.origin, ray.direction, hit, Mathf.Infinity, mask))
   {
      var hitPoint : Vector3 = hit.point;
      hitPoint.y += 0.5;
      // obstruct, water, voidzone (ignore raycast)
      legalLocation = (obstructionCount==0) && (hit.collider.gameObject.layer != 4);

      // Placing tower position
      if (mode == 0)
      {
         transform.position = hitPoint;
         transform.position.y += (tower.verticalOffset + tower.verticalOffset*Mathf.Lerp(tower.scaleLimits.x, tower.scaleLimits.y, tower.AdjustStrength(tower.strength, true)));
         // AOE object follows cursor
         tower.FOV.transform.position = transform.position;
         tower.FOV.transform.rotation = transform.rotation;
      }
      // Orienting tower rotation
      else if (mode == 1)
      {
         //if (!GUIControl.RMBDragging)
         //{
            hitPoint.y = transform.position.y;
            transform.LookAt(hitPoint);
            tower.FOV.rotation = transform.rotation;
         //}
      }
      // Placing FOV position (like with a mortar)
      else if (mode == 2)
      {
         var forwardVec : Vector3 = hitPoint-transform.position;
         if (forwardVec.magnitude <= tower.base.fovRangeLimit)
         {
            tower.FOV.transform.position = hitPoint;
            tower.FOV.transform.position.y += (tower.verticalOffset + tower.verticalOffset*Mathf.Lerp(tower.scaleLimits.x, tower.scaleLimits.y, tower.AdjustStrength(tower.strength, true)));
         }
         else
         {
            var newPoint : Vector3 = transform.position + (forwardVec.normalized*tower.base.fovRangeLimit);
            newPoint.y = 25000;
            if (Physics.Raycast(newPoint, Vector3.down, hit, Mathf.Infinity, mask))
            {
               tower.FOV.transform.position = hit.point;
               tower.FOV.transform.position.y += (tower.verticalOffset + tower.verticalOffset*Mathf.Lerp(tower.scaleLimits.x, tower.scaleLimits.y, tower.AdjustStrength(tower.strength, true)));
            }
         }

         // Spin to face the position of the FOV
         tower.transform.LookAt(tower.FOV.transform.position);

         // Check for next ballistic tracer shot
         if (lastTrajectoryPos != tower.FOV.transform.position)
         {
            nextTrajectoryTime = Time.time+0.1;
            if (shotFX)
               Destroy(shotFX.gameObject);
            lastTrajectoryPos = tower.FOV.transform.position;
         }

         // Shoots a tracer projectile to show path of ballistic projectile
         if (Time.time > nextTrajectoryTime)
         {
            nextTrajectoryTime = Time.time + 10.0;
            if (shotFX)
               Destroy(shotFX.gameObject);
            shotFX = Instantiate(tower.trajectoryTracer, transform.position, Quaternion.identity);
            var shotFXScr = shotFX.GetComponent(BallisticProjectile);
            shotFXScr.targetPos = tower.FOV.transform.position;
            shotFXScr.SetColor(tower.color);
            shotFXScr.Fire();
         }
      }

      // Set cursor color based on valid location (gray if invalid)
      var newColor : Color = (legalLocation && canAfford) ? tower.color : Color.gray;
      if (newColor != cursorColor)
      {
         cursorColor = newColor;
         tower.SetColor(cursorColor, true);
      }
   }
   else
   {
      legalLocation = false;
   }

}

function OnTriggerEnter(other : Collider)
{
   // 9=OBSTRUCT, 2=IgnoreRaycast (voidzones)
   // NOTE: voidzones are layer 2 otherwise they block unit click selection.
   if (other.gameObject.layer==9 || other.gameObject.layer==2)
      obstructionCount += 1;
}

function OnTriggerExit(other : Collider)
{
   // 9=OBSTRUCT, 2=IgnoreRaycast (voidzones)
   // NOTE: voidzones are layer 2 otherwise they block unit click selection.
   if (other.gameObject.layer==9 || other.gameObject.layer==2)
      obstructionCount -= 1;
}