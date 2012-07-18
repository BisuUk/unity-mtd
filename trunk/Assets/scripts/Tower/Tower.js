#pragma strict
#pragma downcast

var ID : int;
var type : int;
var range : float;
var fov : float;
var effect : int;
var fireRate : float;
var strength : float;

var tempRange : float;
var tempFOV : float;
var tempEffect : int;
var tempFireRate : float;
var tempStrength : float;
var tempColor : Color;

var color : Color;
var costs : TowerCost;
var base : TowerAttributes;
var targetingBehavior : int = 1;
var targets : List.<Unit>;
var isConstructing : boolean = false;
var placeWithOrient : boolean;
var legalLocation : boolean;
var origRotation : Quaternion;
var defaultMaterial: Material;
var constructingMaterial : Material;
var slowMaterial : Material;
var paintMaterial : Material;
var infoPlane : Transform;
var FOVMeshFilter : MeshFilter;
var FOVMeshRender: MeshRenderer;
var FOV : Transform;
var FOVCollider: MeshCollider;
var netView : NetworkView;

private var constructionDuration : float;
private var startConstructionTime : float = 0.0;
private var endConstructionTime : float = 0.0;
private var hasTempAttributes : boolean = false;
private var isSelected : boolean = false;

var kills : int = 0;    // Stats

function Awake()
{
   // Detach FOV meshes so they don't rotate with parent
   FOV.parent = null;
   //FOVMeshRender.material = new Material(Shader.Find("Transparent/Diffuse"));

   // Detach FOV meshes so they don't rotate with parent
   FOVCollider.transform.parent = null;

   // Set default attributes
   SetFOV(base.defaultFOV);
   SetRange(base.defaultRange);
   SetFireRate(base.defaultFireRate);
   SetStrength(base.defaultStrength);

   tempFOV = base.defaultFOV;
   tempRange = base.defaultRange;
   tempStrength = base.defaultStrength;
   tempFireRate = base.defaultFireRate;
   tempEffect = base.defaultEffect;
   tempColor = Color.white;
}

function Initialize(newRange : float, newFOV : float, newRate : float, newStrength : float, newEffect : int, newColor : Color, newBehaviour : int)
{
   SetFOV(newFOV);
   SetRange(newRange);
   SetStrength(newStrength);
   SetFireRate(newRate);
   SetEffect(newEffect);
   SetColor(newColor);

   tempFOV = newFOV;
   tempRange = newRange;
   tempStrength = newStrength;
   tempFireRate = newRate;
   tempEffect = newEffect;
   tempColor = newColor;

   targetingBehavior = newBehaviour;

   origRotation = transform.rotation;
   FOVMeshRender.enabled = false;

   // For applying damages
   ID = Utility.GetUniqueID();

   // Init on server, and then send init info to clients
   if (Game.hostType > 0)
      netView.RPC("ClientInitialize", RPCMode.Others, newRange, newFOV, newRate, newStrength, newEffect, newColor.r, newColor.g, newColor.b, newBehaviour);

   // Start constructing visuals, and tell clients to do the same
   SetConstructing(TimeCost());
   if (Game.hostType > 0)
      netView.RPC("SetConstructing", RPCMode.Others, TimeCost());
}

@RPC
function ClientInitialize(newRange : float, newFOV : float, newRate : float, newStrength : float,
              newEffect : int, colorRed : float, colorGreen : float, colorBlue : float,
              newBehaviour : int)
{
   SetFOV(newFOV);
   SetRange(newRange);
   SetStrength(newStrength);
   SetFireRate(newRate);
   SetEffect(newEffect);
   SetColor(Color(colorRed, colorGreen, colorBlue));
   targetingBehavior = newBehaviour;

   tempFOV = newFOV;
   tempRange = newRange;
   tempStrength = newStrength;
   tempFireRate = newRate;
   tempEffect = newEffect;
   tempColor = Color(colorRed, colorGreen, colorBlue);

   FOVMeshRender.enabled = false;
}

@RPC
function ModifyBehavior(newBehaviour : int)
{
   targetingBehavior = newBehaviour;
}

@RPC
function Modify(newRange : float, newFOV : float, newRate : float, newStrength : float,
                newEffect : int, colorRed : float, colorGreen : float, colorBlue : float,
                newBehaviour : int)
{
   var origTimeCost : float = TimeCost();
   var origColor : Color = color;
   var timeCost : float = 0.0;
   var newColor : Color = new Color(colorRed, colorGreen, colorBlue);
   var changedEffect : boolean = false;

   SetFOV(newFOV);
   SetRange(newRange);
   SetStrength(newStrength);
   SetFireRate(newRate);
   if (newEffect != effect)
      changedEffect = true;
   SetEffect(newEffect);
   SetColor(newColor);
   targetingBehavior = newBehaviour;

   // Init on server, and then send init info to clients
   if (Game.hostType > 0)
      netView.RPC("ClientInitialize", RPCMode.Others, newRange, newFOV, newRate, newStrength, newEffect, colorRed, colorGreen, colorBlue, newBehaviour);

   var newTimeCost : float = TimeCost();
   timeCost = (changedEffect) ? newTimeCost : Mathf.Abs(newTimeCost - origTimeCost);

   //var colorDiffCost : float = costs.ColorDiffTimeCost(color, newColor);
   var colorDiff : float = (1.0-Utility.ColorMatch(origColor, newColor));
   timeCost += ((newTimeCost/2) * colorDiff);

   // Start constructing visuals, and tell clients to do the same
   SetConstructing(timeCost);
   if (Game.hostType > 0)
      netView.RPC("SetConstructing", RPCMode.Others, timeCost);
}

function Update()
{
   if (isConstructing)
   {
      // Animate model texture for that weird fx...
      var texOffset : Vector2 = Vector2(Time.time * 5.0, Time.time * 5.0);
      SetChildrenTextureOffset(transform, texOffset);

      // Animate clock gui texture
      infoPlane.transform.position = transform.position + (Camera.main.transform.up*1.1);  //+ (Camera.main.transform.right*0.75);
      var timerVal : float = (Time.time-startConstructionTime)/constructionDuration;
      infoPlane.renderer.material.SetFloat("_Cutoff", Mathf.InverseLerp(0, 1, timerVal));

      // Server checks completion time and informs clients
      if ((Network.isServer || Game.hostType==0) && Time.time >= endConstructionTime)
      {
         SetConstructing(0.0);
         if (Game.hostType>0)
            netView.RPC("SetConstructing", RPCMode.Others, 0.0);
      }
   }
   else
   {
      if (isSelected && hasTempAttributes)
      {
         // Check to see if the selection will fit in new space
         var collider : SphereCollider = GetComponent(SphereCollider);
         var mask2 = (1 << 9); // OBSTRUCT
         gameObject.layer = 0; // So we don't obstruct ourself
         legalLocation = (Physics.CheckSphere(transform.position, collider.radius*transform.localScale.x, mask2)==false);
         gameObject.layer = 9; // Reapply obstruct
         // Set color based on valid location (gray if invalid)
         var newColor : Color = (legalLocation) ? tempColor : Color.gray;
         SetChildrenColor(transform, newColor);
         FOV.renderer.material.color = newColor;
         // Pulsate FOV indicating change
         FOVMeshRender.material.color.a = GUIControl.colorPulsateValue;
      }
      else
      {
         legalLocation = true;
      }

      // Cleanup any dead targets
      for (var i : int = targets.Count-1; i >= 0; --i)
      {
         var unit : Unit = targets[i];
         if (!unit)
         {
            targets.RemoveAt(i); // if target is null, remove from list
         }
      }
   }
}

function SetRange(newRange : float)
{
   range = newRange;
   FOV.transform.localScale = Vector3.one*(newRange);
   FOVCollider.transform.localScale = FOV.transform.localScale;
}

function SetTempRange(newRange : float)
{
   hasTempAttributes = true;
   tempRange = newRange;
   FOV.transform.localScale = Vector3.one*(newRange);
}

function SetFireRate(newFireRate : float)
{
   fireRate = newFireRate;
   hasTempAttributes = true;
}

function SetTempFireRate(newFireRate : float)
{
   tempFireRate = newFireRate;
   hasTempAttributes = true;
}

function SetFOV(newFOV : float)
{
   fov = newFOV;
   SetFOVMesh(newFOV);
   FOVCollider.sharedMesh = FOVMeshFilter.mesh;
   FOVCollider.transform.localScale = FOV.transform.localScale;
   targets.Clear();
}

function SetTempFOV(newFOV : float)
{
   tempFOV = newFOV;
   hasTempAttributes = true;
   SetFOVMesh(newFOV);
}

function SetStrength(newStrength : float)
{
   strength = newStrength;
   var s : float = 0.6 + (AdjustStrength(strength, true)*0.75);
   transform.localScale = Vector3(s,s,s);
}

function SetTempStrength(newStrength : float)
{
   tempStrength = newStrength;
   hasTempAttributes = true;
   var s : float = 0.6 + (AdjustStrength(newStrength, true)*0.75);
   transform.localScale = Vector3(s,s,s);
}

function SetColor(newColor : Color)
{
   color = newColor;
   SetChildrenColor(transform, newColor);
   if (FOVMeshRender)
   {
      FOVMeshRender.material.color = color;
      FOVMeshRender.material.color.a = 0.3;
   }
}

function SetTempColor(newColor : Color)
{
   tempColor = newColor;
   hasTempAttributes = true;
   SetChildrenColor(transform, newColor);
   if (FOVMeshRender)
   {
      FOVMeshRender.material.color = newColor;
      FOVMeshRender.material.color.a = 0.3;
   }
}

function SetEffect(newEffect : int)
{
   effect = newEffect;
   switch (effect)
   {
      case 1:
         SetChildrenMaterialColor(transform, slowMaterial, color);
         break;
      case 2:
         SetChildrenMaterialColor(transform, paintMaterial, color);
         break;
      default:
         SetChildrenMaterialColor(transform, defaultMaterial, color);
         break;
   }   
}

function SetTempEffect(newEffect : int)
{
   hasTempAttributes = true;
   var c : Color = renderer.material.color;
   switch (newEffect)
   {
      case 1:
         SetChildrenMaterialColor(transform, slowMaterial, c);
         break;
      case 2:
         SetChildrenMaterialColor(transform, paintMaterial, c);
         break;
      default:
         SetChildrenMaterialColor(transform, defaultMaterial, c);
         break;
   }
}

private var lastAOE = -1;
function SetFOVMesh(newAOE : float)
{
   if (lastAOE != newAOE)
   {
      FOVMeshFilter.mesh = TowerUtil.CreateAOEMesh(newAOE, 1.0);
      lastAOE = newAOE;
   }
}

@RPC
function SetConstructing(duration : float)
{
   isConstructing = (duration > 0.0);

   if (isConstructing)
   {
      constructionDuration = duration;
      startConstructionTime = Time.time;
      endConstructionTime = Time.time + constructionDuration;
      infoPlane.renderer.enabled = true;

      // Set model texture for that weird fx...
      SetChildrenMaterialColor(transform, constructingMaterial, color);

      FOVMeshRender.material.color = color;
      FOVMeshRender.material.color.a = 0.3;
      hasTempAttributes = false;
   }
   else
   {
      constructionDuration = 0.0;
      startConstructionTime = 0.0;
      endConstructionTime = 0.0;
      infoPlane.renderer.enabled = false;
      // Render normally - no build fx
      switch (effect)
      {
         case 1:
            SetChildrenMaterialColor(transform, slowMaterial, color);
            break;
         case 2:
            SetChildrenMaterialColor(transform, paintMaterial, color);
            break;
         default:
            SetChildrenMaterialColor(transform, defaultMaterial, color);
            break;
      }
   }
}

// Find the the closest unit
function FindClosestUnit() : GameObject
{
    // Find all game objects with tag Enemy
    var gos : GameObject[] = GameObject.FindGameObjectsWithTag("UNIT");
    var closest : GameObject; 
    var distance = Mathf.Infinity; 
    var position = transform.position; 
    // Iterate through them and find the closest one
    for (var go : GameObject in gos)
    {
        var diff = (go.transform.position - position);
        var curDistance = diff.sqrMagnitude; 
        if (curDistance < distance)
        {
            closest = go; 
            distance = curDistance; 
        }
    }
    return closest;    
}

function AddTarget(unit : Unit)
{
   targets.Add(unit);
}

function RemoveTarget(unit : Unit)
{
   targets.Remove(unit); // O(n)
}

function FindSingleTarget(checkLOS : boolean)
{
   var targ : GameObject = null;
   var position : Vector3 = transform.position;
   var closestDist : float = Mathf.Infinity;
   var leastHealth : float = Mathf.Infinity;
   var bestColorDiff : float = 0.0;

   // Iterate through them and find best target for behavior.
   // NOTE: Iterates backwards so a remove can safely occur
   // without throwing off iterators.
   for (var i : int = targets.Count-1; i >= 0; --i)
   {
      var unit : Unit = targets[i];
      if (!unit)
      {
         targets.RemoveAt(i); // if target is null, remove from list
      }
      // Check unit is alive and not paused
      else if (unit.isAttackable)
      {
         var diff = (unit.transform.position - position);
         var dist = diff.magnitude;

         // Check object is in range...
         if (dist <= range)
         {
            // Check if object is in FOV...
            var angle : float = Quaternion.Angle(Quaternion.LookRotation(diff), origRotation);
            if (Mathf.Abs(angle) <= fov/2.0)
            {
               var pass : boolean = false;

               if (checkLOS == false)
                  pass = true;
               else
               {
                  // Check if object is in line of sight
                  var mask = (1 << 9); // OBSTRUCT
                  if (Physics.Linecast(transform.position, unit.transform.position, mask)==false)
                     pass = true;
               }

               if (pass)
               {
                  // Target closest
                  switch (targetingBehavior)
                  {
                     // WEAKEST
                     case 0:
                        if (unit.health < leastHealth)
                        {
                           leastHealth = unit.health;
                           targ = unit.gameObject;
                        }
                     break;

                     // CLOSEST
                     case 1:
                        if (dist < closestDist)
                        {
                           closestDist = dist;
                           targ = unit.gameObject;
                        }
                     break;

                     // BEST COLOR
                     case 2:
                        var unitColor : Color = unit.actualColor;
                        var colorDiff = Utility.ColorMatch(color, unitColor);
                        if (colorDiff > bestColorDiff)
                        {
                           bestColorDiff = colorDiff;
                           targ = unit.gameObject;
                        }
                     break;
                  }
               }
            }
         }
      }
   }
   return targ;
}

function Cost() : float
{
   return costs.Cost(
      AdjustRange(range, true),
      AdjustFOV(fov, true),
      AdjustFireRate(fireRate, true),
      AdjustStrength(strength, true),
      effect);
}

function TimeCost() : float
{
   return costs.TimeCost(
      AdjustRange(range, true),
      AdjustFOV(fov, true),
      AdjustFireRate(fireRate, true),
      AdjustStrength(strength, true),
      effect);
}

function TempCost() : float
{
   return costs.Cost(
      AdjustRange(tempRange, true),
      AdjustFOV(tempFOV, true),
      AdjustFireRate(tempFireRate, true),
      AdjustStrength(tempStrength, true),
      tempEffect);
}

function TempTimeCost() : float
{
   return costs.TimeCost(
      AdjustRange(tempRange, true),
      AdjustFOV(tempFOV, true),
      AdjustFireRate(tempFireRate, true),
      AdjustStrength(tempStrength, true),
      tempEffect);
}

function SetSelected(selected : boolean)
{
   isSelected = selected;

   // If tower was visually modified by the GUI, revert changes
   if (!isSelected && !isConstructing)
   {
      //SetTempFOV(fov); // clears FOV mesh
      SetTempRange(range);
      SetTempColor(color);
      SetTempStrength(strength);
      SetTempEffect(effect);
      SetTempColor(color);
      hasTempAttributes = false;
   }
   // If this tower is selected, draw FOV
   FOVMeshRender.enabled = isSelected;
}

function OnMouseDown()
{
   // Defender selects this tower
   if (!Game.player.isAttacker)
      GUIControl.defendGUI.SelectTower(this);
}

function OnMouseEnter()
{
   // Attacker mouseover to see FOV
   if (Game.player.isAttacker)
      FOVMeshRender.enabled = true;
}

function OnMouseExit()
{
   // Attacker mouseover to see FOV
   if (Game.player.isAttacker)
      FOVMeshRender.enabled = false;
}

private function SetChildrenTextureOffset(t : Transform, newOffset : Vector2)
{
   if (t != infoPlane && t != FOV)
      t.renderer.material.SetTextureOffset("_MainTex", newOffset);
   for (var child : Transform in t)
      SetChildrenTextureOffset(child, newOffset);
}

private function SetChildrenMaterialColor(t : Transform, newMaterial : Material, newColor : Color)
{
   if (t != infoPlane && t != FOV)
   {
      t.renderer.material = newMaterial;
      t.renderer.material.SetColor("_TintColor", newColor);
      t.renderer.material.color = newColor;
   }
   for (var child : Transform in t)
      SetChildrenMaterialColor(child, newMaterial, newColor);
}

function SetChildrenColor(t : Transform, newColor : Color)
{
   if (t != infoPlane)
      t.renderer.material.color = newColor;
   for (var child : Transform in t)
      SetChildrenColor(child, newColor);
}

function SetDefaultBehaviorEnabled(setValue : boolean)
{
   enabled = setValue;
}

function OnDestroy()
{
   if (FOV)
      Destroy(FOV.gameObject);
   if (FOVCollider)
      Destroy(FOVCollider.gameObject);
}

function OnNetworkInstantiate(info : NetworkMessageInfo)
{
   // Network instantiated, turn on netview
   netView.enabled = true;
   origRotation = transform.rotation;
   FOVMeshRender.enabled = false;
}

function OnSerializeNetworkView(stream : BitStream, info : NetworkMessageInfo)
{
   //var pos : Vector3 = transform.position;
   //stream.Serialize(pos);
   var rot : Quaternion = transform.localRotation;
   stream.Serialize(rot);

   if (stream.isWriting)
   {

   }
   else
   {
      transform.localRotation = rot;
   }
}

function AdjustRange(theRange : float, normalize : boolean) : float
{
   return (normalize) ? Mathf.InverseLerp(base.minRange, base.maxRange, theRange) : Mathf.Lerp(base.minRange, base.maxRange, theRange);
}

function AdjustFOV(theFOV : float, normalize : boolean) : float
{
   return (normalize) ? Mathf.InverseLerp(base.minFOV, base.maxFOV, theFOV) : Mathf.Lerp(base.minFOV, base.maxFOV, theFOV);
}

function AdjustFireRate(theFireRate : float, normalize : boolean) : float
{
   //return (normalize) ? Mathf.InverseLerp(maxFireRate, minFireRate, theFireRate) : Mathf.Lerp(maxFireRate, minFireRate, theFireRate);
   return (normalize) ? Mathf.InverseLerp(base.minFireRate, base.maxFireRate, theFireRate) : Mathf.Lerp(base.minFireRate, base.maxFireRate, theFireRate);
}

function AdjustStrength(theStrength: float, normalize : boolean) : float
{
   return (normalize) ? Mathf.InverseLerp(base.minStrength, base.maxStrength, theStrength) : Mathf.Lerp(base.minStrength, base.maxStrength, theStrength);
}