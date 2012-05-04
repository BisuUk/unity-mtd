#pragma strict

var netView : NetworkView;

static var player : PlayerData;
static var map : MapData;
static var self : GameData;
static var hostType : int;
static var roundTime : float;
static var score : int;

static private var roundStartTime : float;
static private var idGenerator : int = 0;

function Awake()
{
   if (player == null)
      player = GetComponent(PlayerData);
   if (map == null)
      map = GetComponent(MapData);
   if (self == null)
      self = this;
}

function Start ()
{
   roundStartTime = Time.time;
}

function Update ()
{
   if (Time.time >= roundStartTime+roundTime)
   {
      // Round over!
   }
}

static function GetUniqueID() : int
{
   idGenerator += 1;
   return idGenerator;
}

@RPC
function RemoteScore(amount : int)
{
   score += amount;
}

static function Score(amount : int)
{
   score += amount;
   if (Network.isServer)
      self.netView.RPC("RemoteScore", RPCMode.Others, amount);
}