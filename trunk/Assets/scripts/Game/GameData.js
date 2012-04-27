#pragma strict


static var player : PlayerData;
static var map : MapData;

static var hostType : int;

static var roundTime : float = 10*60;
static private var roundStartTime : float;
static private var idGenerator : int = 0;

function Awake()
{
   if (player == null)
      player = GetComponent(PlayerData);
   if (map == null)
      map = GetComponent(MapData);
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
