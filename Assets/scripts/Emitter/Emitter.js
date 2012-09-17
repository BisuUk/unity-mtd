#pragma strict
#pragma downcast

var leapPosition : Transform;
var emitPosition : Transform;
var splashPosition : Transform;
var followPath : Transform;
var countDown : Transform;
var launchSpeed : float;
var launchSpeedLimits : Vector2;
var launchTimeSpacing: float = 0.5;
var autoLaunch : boolean;
var speedCostMult : float;
var speedTimeCostMult : float;
var color : Color;
var strength : float;
var maxQueueSize : int;
//var launchTime : float = 0.0;
var unitQueue : List.<UnitAttributes>;
var path : List.<Vector3>;
var netView : NetworkView;
var curveVarA : float;
var curveVarB : float;
var curveVarC : float;
var isLaunchingQueue : boolean;

private var queueCount : int;
private var nextUnitLaunchTime : float;
private var launchQueue : List.<UnitAttributes>;
private var previewUnits : List.<Unit>;
private var isSelected : boolean;


function Awake()
{
   // Detach GUI text because rotating parented GUI text
   // gets all sheared and fucked up for some reason...
   // I'm sure it's some mathy bullshit.
   countDown.transform.parent = null;
   //launchTime = 0.0;
   unitQueue = new List.<UnitAttributes>();
   launchQueue = new List.<UnitAttributes>();
   previewUnits = new List.<Unit>();
   isSelected = false;
   color = Color.white;
   Reset();
   isLaunchingQueue = false;
}

function Start()
{
   // Parse path for this emitter
   path = new List.<Vector3>();
   if (followPath != null)
   {
      var tempTransforms = followPath.GetComponentsInChildren(Transform);
      var pathIndex = 1;
      path.Add(emitPosition.position);
      for (var tr : Transform in tempTransforms)
      {
         if (tr != followPath.transform)
         {
            path.Add(tr.position);
            //LR.SetPosition(pathIndex, tr.position);
            pathIndex++;
         }
      }
      // Add on endpoint
      var endPoint : GameObject = GameObject.Find("EndPoint");
      if (endPoint)
         path.Add(endPoint.transform.position);
   }
}

function Update()
{
   if (!isLaunchingQueue)
   {
      if (autoLaunch)
         Launch();
      countDown.renderer.enabled = false;
   }
   else if (!Network.isClient)
   {
      if (Time.time >= nextUnitLaunchTime)
         LaunchQueuedUnit();
   }
}

function OnMouseDown()
{
   // Select here, NOTE: Update() will call SetSelected
   if (Game.player.isAttacker)
   {
      Game.player.selectedEmitter = this;
      GUIControl.SignalGUI(1, "OnSelectEmitter");
   }
}

@RPC
function Launch()
{
   if (!isLaunchingQueue)
   {
      var costValue : float = GetCost();
      if (costValue <= Game.player.credits)
      {
         // NOTE: Client is calculating cost, unsecure.
         Game.player.credits -= costValue;

         if (!Network.isClient)
         {
            // Copy units to launchQueue
            var slowestSpeed : float = Mathf.Infinity;
            for (var ua : UnitAttributes in unitQueue)
            {
               // This launch squad will only go as fast as the slowest unit
               if ((1.0-ua.strength) < slowestSpeed)
                  slowestSpeed = (1.0-ua.strength);

               var newUA : UnitAttributes = new UnitAttributes();
               newUA.Copy(ua);
               launchQueue.Add(newUA);
            }
            launchSpeed = slowestSpeed;
            SetLaunching(true);
            // Spawn units on emitter
            //LaunchUnits(launchSpeed, GetTimeCost());
         }
         else // Client sends queue data to server
         {
            // Send this queue of unit attributes to server
            // Yes, one by one, it's ugly, got a better idea?
            for (var ua : UnitAttributes in unitQueue)
            {
               netView.RPC("ClientLaunchUnitsAttributes", RPCMode.Server,
                  ua.unitType, ua.size, ua.speed, ua.strength, color.r, color.g, color.b);
            }
            // Tell server we hit launch
            netView.RPC("FromClientLaunch", RPCMode.Server);
         }
      }
   }
}

@RPC
function FromClientLaunch()
{
   if (!isLaunchingQueue)
   {
      var slowestSpeed : float = Mathf.Infinity;
      for (var ua : UnitAttributes in launchQueue)
      {
         // This launch squad will only go as fast as the slowest unit
         if ((1.0-ua.strength) < slowestSpeed)
            slowestSpeed = (1.0-ua.strength);
      }
      launchSpeed = slowestSpeed;
      SetLaunching(true);
   }
}

@RPC
function SetLaunching(isLaunching : boolean)
{
   if (Network.isServer)
      netView.RPC("SetLaunching", RPCMode.Others, isLaunching);
   isLaunchingQueue = isLaunching;
}

function LaunchQueuedUnit()
{
   // Server handles when it is time to emit units
   var newUnit : GameObject;
   var launchStart : Vector3 = leapPosition.position;
   var squadID : int = Utility.GetUniqueID();
   // Start launch countdown
   //SetLaunchDuration(duration);

   // Spawn first unit in queue
   if (launchQueue.Count > 0)
   {
      var unitAttr : UnitAttributes = launchQueue[0];
      var prefabName : String = Unit.PrefabName(unitAttr.unitType);

      if (Game.hostType > 0)
         newUnit = Network.Instantiate(Resources.Load(prefabName, GameObject), launchStart, Quaternion.identity, 0);
      else
         newUnit = Instantiate(Resources.Load(prefabName, GameObject), launchStart, Quaternion.identity);

      //unitAttr.speed = Mathf.Lerp(launchSpeedLimits.x, launchSpeedLimits.y, speed);
      //unitAttr.speed = (launchSlowly) ? launchSpeedLimits.x : launchSpeedLimits.y;
      unitAttr.speed = Mathf.Lerp(launchSpeedLimits.x, launchSpeedLimits.y, launchSpeed);

      var newUnitScr : Unit = newUnit.GetComponent(Unit);
      newUnitScr.ID = Utility.GetUniqueID();
      newUnitScr.squadID = squadID;
      newUnitScr.emitter = this;
      newUnitScr.SetPath(path);
      newUnitScr.SetAttributes(unitAttr);
      // Send attributes to client so it can calculate FX like radii etc.
      if (Network.isServer)
      {
         newUnitScr.netView.RPC("ClientSetAttributes", RPCMode.Others,
            unitAttr.unitType, unitAttr.size, unitAttr.speed, unitAttr.strength,
            unitAttr.color.r, unitAttr.color.g, unitAttr.color.b, netView.viewID);
      }

      // Remove this unit from queue, since he's launched now
      launchQueue.RemoveAt(0);

      // Cooldown before next unit launch, scales to squad speed
      var spacing : float = launchTimeSpacing + Mathf.Pow(launchSpeed,2)*2.0 + launchSpeed*-4.0 + 2.0;
      nextUnitLaunchTime =  Time.time + spacing;

      // Check if queue is empty now
      if (launchQueue.Count <= 0)
         SetLaunching(false);
   }
   else // Queue is empty
   {
      SetLaunching(false);
   }
}

@RPC
function ClientLaunchUnitsAttributes(newUnitType : int, newSize  : float, newSpeed : float, newStrength : float, colorRed : float, colorGreen : float, colorBlue : float)
{
   if (!isLaunchingQueue)
   {
      var ua : UnitAttributes = new UnitAttributes();
      ua.unitType = newUnitType;
      ua.size = newSize;
      //ua.speed = newSpeed // Set by launcher
      ua.strength = newStrength;
      ua.color = Color(colorRed, colorGreen, colorBlue);

      launchQueue.Add(ua);
   }
}

function Reset()
{
   unitQueue.Clear();
   color = Color.white;
}

function AddToQueue(ua : UnitAttributes) : boolean
{
   if (unitQueue.Count >= maxQueueSize)
      return false;

   unitQueue.Add(ua);
   ua.color = color;
   ua.strength = strength;
   ua.size = strength;

   return true;
}

function InsertIntoQueue(index : int, ua : UnitAttributes) : boolean
{
   if (unitQueue.Count >= maxQueueSize)
      return false;

   unitQueue.Insert(index, ua);
   ua.color = color;
   ua.strength = strength;
   ua.size = strength;

   return true;
}

function RemoveFromQueue(index : int)
{
   if (index < 0 || index >= unitQueue.Count)
      return;

   unitQueue.RemoveAt(index);
}

function MoveInQueue(index : int, forward : boolean)
{
   var tempIndex : int = index;
   var temp : UnitAttributes = unitQueue[tempIndex];
   unitQueue.RemoveAt(tempIndex);
   //previewUnits.RemoveAt(tempIndex);
   tempIndex = (forward) ? tempIndex-1 : tempIndex+1;
   InsertIntoQueue(tempIndex, temp);
}

function SetAttributesForIndex(attributes : UnitAttributes, index : int)
{
   unitQueue[index].Copy(attributes);
}

function GetCost() : int
{
   var total : int = 0;
   for (var u : Unit in previewUnits)
      total += u.Cost();
   return total*(Mathf.Lerp(1.0, speedCostMult, launchSpeed));
}

function GetTimeCost() : float
{
   var total : float = 0.0;
   for (var u : Unit in previewUnits)
      total += u.TimeCost();
   return total*(Mathf.Lerp(1.0, speedTimeCostMult, launchSpeed));
}

function SetColor(newColor : Color)
{
   color = newColor;
   // Send unit attributes to server, one by one
   for (var ua : UnitAttributes in unitQueue)
      ua.color = color;
}

function SetStrength(newStrength : float)
{
   strength = newStrength;
   // Send unit attributes to server, one by one
   for (var ua : UnitAttributes in unitQueue)
   {
      ua.strength = strength;
      ua.size = strength;
   }
}

